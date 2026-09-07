"""Register the 2026-09-07 supplied components against their approved references.

Source artwork is copied verbatim; generated WebP files are deterministic crops,
resizes and compositions, never generated illustrations. Requires Pillow,
numpy and opencv-python-headless. docs/input is never modified.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/design/2026-09-07"
SOURCES = OUTPUT / "source"
QA = ROOT / "artifacts/asset-refresh"
GROUPS = {
    "guide": ("1-kv", "h5kv - 9.4完整图.png"),
    "archive-1": ("2-长图模块1", "长图模块一完整.png"),
    "archive-2": ("2-长图模块2", "长图模块二完整.jpg"),
    "archive-3": ("2-长图模块3", "长图模块三.jpg"),
    "inspection": ("3-报告检测页面-模块1", "报告点击页-模块1-完整图.jpg"),
    "review": ("3-报告检测页面-模块2", "报告点击页模块2-完整图.jpg"),
    "traceability": ("3-报告检测页面-模块3", "报告点击页模块3-完整图.jpg"),
    "loading": ("h5-加载页输出", "加载页.jpg"),
}


def rgba(path):
    return Image.open(path).convert("RGBA")


def register(reference, image, scale=1.0):
    """Masked source-pixel registration, with transparent artboard overflow.

    The coarse match is refined at source resolution. Opaque samples avoid
    treating transparent pixels as a black background.
    """
    # Texture/illustration components may have been uniformly resized by the
    # designer. Derive their transform from matching internal source features.
    if image.width > 500 and image.height > 500:
        src = np.asarray(image.resize((round(image.width*.5), round(image.height*.5))))
        dst = np.asarray(reference.convert("RGB").resize((round(reference.width*.5), round(reference.height*.5))))
        sift = cv2.SIFT_create(nfeatures=6000)
        k1, d1 = sift.detectAndCompute(cv2.cvtColor(src[:,:,:3], cv2.COLOR_RGB2GRAY), (src[:,:,3]>220).astype(np.uint8)*255)
        k2, d2 = sift.detectAndCompute(cv2.cvtColor(dst, cv2.COLOR_RGB2GRAY), None)
        if d1 is not None and d2 is not None:
            pairs = cv2.BFMatcher().knnMatch(d1, d2, k=2)
            good = [a for a,b in pairs if a.distance < .7*b.distance]
            if len(good) >= 5:
                a = np.float32([k1[m.queryIdx].pt for m in good])
                b = np.float32([k2[m.trainIdx].pt for m in good])
                matrix, inliers = cv2.estimateAffinePartial2D(a,b,method=cv2.RANSAC,ransacReprojThreshold=2)
                if matrix is not None and int(inliers.sum()) >= 5 and abs(matrix[0,1]) < .02:
                    s = float(matrix[0,0])
                    return {"x":round(matrix[0,2]*2),"y":round(matrix[1,2]*2),"width":round(image.width*s),"height":round(image.height*s),"scale":round(s,5),"error":0,"matches":int(inliers.sum())}
    bounds = image.getchannel("A").getbbox()
    part = image.crop(bounds)
    # Oversized folder art has a distinctive top/mascot; sample that area.
    part = part.crop((0, 0, min(part.width, 1900), min(part.height, 1300)))
    if part.width > 1700 and part.height > 800:
        part = part.crop((150, 0, part.width - 150, min(part.height, 1000)))
        bounds = (bounds[0] + 150, bounds[1], *bounds[2:])
    thumb_scale = .25
    ref = np.asarray(reference.convert("RGB"))
    template = part.resize((round(part.width * scale * thumb_scale), round(part.height * scale * thumb_scale)))
    arr = np.asarray(template)
    mask = (arr[:, :, 3] > 230).astype(np.uint8)
    target = cv2.resize(ref, None, fx=thumb_scale, fy=thumb_scale, interpolation=cv2.INTER_AREA)
    pad = 350
    target = cv2.copyMakeBorder(target, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    scores = cv2.matchTemplate(target, arr[:, :, :3], cv2.TM_SQDIFF_NORMED, mask=mask)
    scores[~np.isfinite(scores)] = 100
    _, score, _, _ = cv2.minMaxLoc(scores)
    best = cv2.minMaxLoc(scores)[2]
    x, y = ((best[0]-pad)/thumb_scale, (best[1]-pad)/thumb_scale)
    full = np.asarray(part.resize((round(part.width*scale), round(part.height*scale))))
    mask = full[:, :, 3] > 230
    # Limit refinement to visible samples and avoid masked antialias fringes.
    sy, sx = np.where(mask[::4, ::4])
    sy, sx = sy*4, sx*4
    src = full[sy, sx, :3].astype(np.int16)
    optimum = (float("inf"), x, y)
    for yy in range(round(y)-5, round(y)+6):
        for xx in range(round(x)-5, round(x)+6):
            valid = (sx+xx >= 0) & (sx+xx < ref.shape[1]) & (sy+yy >= 0) & (sy+yy < ref.shape[0])
            if valid.sum() < max(5, len(sx)*.25):
                continue
            score = float(np.abs(ref[sy[valid]+yy, sx[valid]+xx].astype(np.int16)-src[valid]).mean())
            if score < optimum[0]: optimum = (score, xx, yy)
    return {"x": round(optimum[1]-bounds[0]*scale), "y": round(optimum[2]-bounds[1]*scale), "width": round(image.width*scale), "height": round(image.height*scale), "error": round(optimum[0], 3)}


def inventory(source=None):
    if source:
        shutil.copytree(source, SOURCES, dirs_exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    manifest = {"version": "2026-09-07", "files": [], "groups": {}}
    for path in sorted(SOURCES.rglob("*")):
        if path.is_file():
            manifest["files"].append({"source": path.relative_to(SOURCES).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    for name, (folder, ref_name) in GROUPS.items():
        reference = rgba(SOURCES / folder / ref_name)
        group = {"reference": f"{folder}/{ref_name}", "size": list(reference.size), "parts": {}}
        for path in (SOURCES/folder).rglob("*.png"):
            if path.name == ref_name or "底" in path.name or "背景" in path.name or path.name == "h5kv - 输出.png": continue
            im = rgba(path)
            pos = register(reference, im)
            pos["source"] = path.relative_to(SOURCES).as_posix()
            group["parts"][path.stem] = pos
            print(name, path.stem, pos["x"], pos["y"], pos["error"], flush=True)
        manifest["groups"][name] = group
    (OUTPUT/"manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")


def build_fish_motion(config):
    """Recover the original alternating fish poses, including rotation.

    One complete out-and-back now follows the shared click-cue duration.
    The historical 24-frame duration remains provenance, not playback timing.
    """
    css=["/* Original GIF fish poses; one out-and-back uses the shared click-cue rhythm. */"]
    def pose(frame):
        pixels=np.asarray(frame.convert("RGBA"))
        mask=(pixels[:,:,0]>220)&(pixels[:,:,1]>180)&(pixels[:,:,2]<180)&(pixels[:,:,3]>0)
        y,x=np.where(mask)
        center=np.array([x.mean(),y.mean()])
        points=np.column_stack((x,y))-center
        _,vectors=np.linalg.eigh(points.T@points/len(points))
        axis=vectors[:,-1]
        angle=math.degrees(math.atan2(axis[1],axis[0]))
        angle=(angle+90)%180-90
        return center,angle,np.array([x.max()-x.min()+1,y.max()-y.min()+1])
    for index in range(4):
        gif=Image.open(ROOT/f"public/design/final-v1/motion/archive-runtime/fish-motion-0{index+1}.gif")
        first,angle,size=pose(gif)
        gif.seek(1)
        second,next_angle,_=pose(gif)
        dx,dy=(second-first)/size*100
        turn=(next_angle-angle+90)%180-90
        css.append(f'.archive-fish-motion-gif[data-fish-index="{index+1}"] {{ animation: source-fish-{index+1} var(--archive-fish-duration) ease-in-out infinite; }}')
        css.append(f'@keyframes source-fish-{index+1} {{')
        css.append('  0%, 100% { transform: translate3d(0,0,0) rotate(0deg); }')
        css.append(f'  50% {{ transform: translate3d({dx:.4f}%,{dy:.4f}%,0) rotate({turn:.4f}deg); }}')
        css.append('}')
    config["fishSourceDurationMs"]=config.pop("fishDurationMs",config.get("fishSourceDurationMs",8640))
    (ROOT/"src/app/design-motion.generated.css").write_text("\n".join(css)+"\n",encoding="utf-8")


def build_archive_entry(config, manifest):
    """Two complete groups, with the approved final frame preserved pixel-for-pixel.

    Resource 5 supplies the actual card/mascot silhouette. The temporary
    covered book area is extended from adjacent pixels of this same reference;
    no old artwork, painted shape or rectangular moving page slice is used.
    """
    group=manifest["groups"]["archive-1"]
    a1=rgba(SOURCES/group["reference"])
    parts=group["parts"]
    for n,x,y in [(11,745,2904),(7,100,2846),(18,134,3312),(19,134,3173)]:
        parts[f"资源 {n}"].update(x=x,y=y)
    mask=np.zeros((a1.height,a1.width),np.uint8)
    for n in [5,6,7,8,9,10,11,12,14,15,16,17,18,19]:
        p=parts[f"资源 {n}"]
        part=rgba(SOURCES/p["source"]).resize((p["width"],p["height"]),Image.Resampling.LANCZOS)
        layer=Image.new("L",a1.size)
        layer.paste(part.getchannel("A"),(p["x"],p["y"]))
        mask=np.maximum(mask,np.asarray(layer))
    mask=cv2.dilate((mask>8).astype(np.uint8)*255,np.ones((7,7),np.uint8))
    batch_mask=Image.fromarray(mask)

    underlay=a1.copy()
    yellow=a1.crop((10,1800,210,2400))
    for y in range(2500,3700,600):
        for x in range(0,1800,200): underlay.paste(yellow,(x,y))
    # Follow the visible, slightly slanted lower book edge. Only the area
    # hidden by the original white card is affected, including its paper base.
    pixels=np.asarray(a1)
    edge=[]
    for x in range(1640,1920):
        col=pixels[3300:3610,x,:3].astype(int)
        ys=np.where((col[:,0]<215)&(col[:,1]<180)&(col[:,0]-col[:,1]>30))[0]
        if len(ys):edge.append((x,int(ys[-1])+3300))
    slope=float(np.polyfit(*np.array(edge).T,1)[0])
    for x in range(1640):
        donor_x=1640+x%200
        shift=round(slope*(x-donor_x))
        column=a1.crop((donor_x,3160,donor_x+1,a1.height))
        feather=Image.fromarray(np.minimum(np.arange(column.height)*255/160,255).astype(np.uint8).reshape(-1,1))
        underlay.paste(column,(x,3160+shift),feather)
    clean=a1.copy();clean.paste(underlay,(0,0),batch_mask)
    batch=a1.copy();batch.putalpha(batch_mask)
    def export(im,box,name):
        cut=im.crop(box)
        width=min(cut.width,1000)
        cut=cut.resize((width,round(cut.height*width/cut.width)),Image.Resampling.LANCZOS)
        cut.save(OUTPUT/f"runtime/{name}.webp","WEBP",quality=92,method=6,exact=True)
        return {"src":f"/design/2026-09-07/runtime/{name}.webp","x":box[0],"y":box[1],"width":box[2]-box[0],"height":box[3]-box[1]}
    config["archiveBook"]=[export(clean,(0,0,2000,3733),"archive-1-book-stage")]
    config["archiveBatch"]=[export(batch,batch_mask.getbbox(),"archive-1-batch-module")]
    config["archiveBatchSourceParts"]=[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
    clean.resize((750,1400)).save(QA/"archive-book-before-batch.png")
    batch.resize((750,1400)).save(QA/"archive-batch-group.png")
    composed=clean.copy();composed.alpha_composite(batch)
    assert np.array_equal(np.asarray(composed),np.asarray(a1)), "Final artwork must match the approved reference"
    composed.resize((750,1400)).save(QA/"archive-entry-complete.png")


def build():
    manifest = json.loads((OUTPUT/"manifest.json").read_text(encoding="utf-8"))
    groups = manifest["groups"]
    runtime = OUTPUT/"runtime"
    runtime.mkdir(exist_ok=True)
    def ref(group): return rgba(SOURCES/groups[group]["reference"])
    def item(group, n): return groups[group]["parts"][f"资源 {n}" if isinstance(n,int) else n]
    def fix(group,n,x,y): item(group,n).update(x=x,y=y)
    def part(group,n):
        p=item(group,n)
        return rgba(SOURCES/p["source"]).resize((p["width"],p["height"]),Image.Resampling.LANCZOS)
    def place(canvas,group,n):
        p=item(group,n);canvas.alpha_composite(part(group,n),(p["x"],p["y"]))
    def save(im,name,width=None):
        if width: im=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
        path=runtime/f"{name}.webp";im.save(path,"WEBP",quality=92,method=6,exact=True)
        return f"/design/2026-09-07/runtime/{name}.webp"
    def save_part(group,n,name=None,offset=0):
        p=item(group,n); im=part(group,n);bbox=im.getchannel("A").getbbox()
        src=save(im.crop(bbox),name or f"{group}-{n}",min(bbox[2]-bbox[0],1000))
        return {"src":src,"x":p["x"]+bbox[0],"y":p["y"]+bbox[1]+offset,"width":bbox[2]-bbox[0],"height":bbox[3]-bbox[1]}

    # Registration of repeated / largely uniform parts uses the original
    # artboard silhouette and its neighbouring registered components.
    fix("archive-2",26,-201,1066)
    fix("archive-2",25,-53,1809)
    fix("archive-2",27,92,2380)
    fix("archive-2",17,359,1894)
    fix("archive-2",15,702,1891)
    a2=rgba(SOURCES/"2-长图模块2/三个模块的底图（都是一样的）.jpg").crop((0,0,2000,4241))
    for n in [3,28,26,29,25,27,24,23]: place(a2,"archive-2",n)
    save(a2,"archive-2-base",1000)
    full=a2.copy()
    for n in [4,5,6,7,11,10,9,8,13,17,16,15,14,18,22,21,20,19]:place(full,"archive-2",n)
    full.resize((750,1590)).save(QA/"archive-2-composed.png")

    # Export all actual source parts with their precise reference coordinates.
    config={"archiveWidth":2000,"archiveHeight":10783,"archive2Top":3733,"archive3Top":7974}
    config["archiveTitles"]=[]
    for slug,label,nums,cue in [("inspection-projects","检测项目",[7,11,10,9,8],4),("review-assurance","复核保障",[13,17,16,15,14],5),("production-traceability","生产溯源",[18,22,21,20,19],6)]:
        config["archiveTitles"].append({"slug":slug,"label":label,"parts":[save_part("archive-2",n,offset=3733) for n in nums],"cue":save_part("archive-2",cue,offset=3733)})

    # One continuous book, then the entire latest-batch card as a single group.
    a1=ref("archive-1")
    def cut_layer(im,box,name,offset=0):
        return {"src":save(im.crop(box),name,min(box[2]-box[0],1000)),"x":box[0],"y":box[1]+offset,"width":box[2]-box[0],"height":box[3]-box[1]}
    build_archive_entry(config,manifest)
    config["archiveRibbon"]=save_part("archive-1",4)
    config["archivePaper"]=save(rgba(SOURCES/"长图三个模块共同的底图（肌理）/底图纹理.jpg"),"archive-paper",750)
    save(part("archive-1",1),"brand-logo",554)

    # Module three keeps the approved complete still as fallback. Its clean
    # letter paper and its moving fish are rebuilt from the independent parts.
    a3=ref("archive-3")
    save(a3,"archive-3",1000)
    clean3=rgba(SOURCES/"2-长图模块3/三个模块的底图（都是一样的）.jpg").crop((0,0,2000,2809))
    place(clean3,"archive-3",41)
    # Seven transparent text exports animate independently. Resource 49 is
    # the original set of underlines and remains on the static backing.
    fix("archive-3",49,380,908)
    story_base=a3.copy()
    story_box=(340,830,1690,1580)
    story_base.paste(clean3.crop(story_box),story_box[:2])
    place(story_base,"archive-3",49)
    save(story_base,"archive-3-static",1000)
    config["storyPatch"]=cut_layer(story_base,story_box,"story-static-underlines",7974)
    config["storyLines"]=[save_part("archive-3",n,f"story-text-{i+1}",7974) for i,n in enumerate([48,47,46,45,44,43,42])]
    # Retain the historical duration as provenance. Playback restores both
    # rotation and translation at the current shared click-cue rhythm.
    config["fishPatch"]=cut_layer(clean3,(0,40,2000,270),"fish-clean",7974)
    config["fishParts"]=[save_part("archive-3",n,offset=7974) for n in [37,39,40,38]]
    old_gif=Image.open(ROOT/"public/design/final-v1/motion/archive-runtime/fish-motion-01.gif")
    durations=[]
    for i in range(old_gif.n_frames):
        old_gif.seek(i);durations.append(old_gif.info.get("duration",40))
    config["fishSourceDurationMs"]=sum(durations)
    build_fish_motion(config)
    # Keep the approved bubbles static while the fish move.
    fish_clean=a3.copy()
    for n in [37,39,40,38]:
        p=item("archive-3",n);box=(p["x"]-3,p["y"]-3,p["x"]+p["width"]+3,p["y"]+p["height"]+3)
        fish_clean.paste(clean3.crop(box),box[:2])
    config["fishPatch"]=cut_layer(fish_clean,(0,40,2000,270),"fish-clean",7974)

    # New KV shares the exact pixels of the existing mascot, mask, logo and
    # paper primitive. Retain their established poses and replace the envelope
    # with the newly supplied report artwork on the same 750x1625 plane.
    oldguide=ROOT/"public/design/guide"
    guide_out=OUTPUT/"guide";guide_out.mkdir(exist_ok=True)
    guide_names=["guide-background","guide-character-open","guide-character-closed","guide-window-mask","guide-arch","report-paper-top","report-paper-left","report-paper-right","report-paper-bottom"]
    for name in guide_names: shutil.copyfile(oldguide/f"{name}.webp",guide_out/f"{name}.webp")
    fg=Image.new("RGBA",(750,1625))
    def guide_place(im,x,y):fg.alpha_composite(im.resize((round(im.width*.375),round(im.height*.375)),Image.Resampling.LANCZOS),(x,y))
    guide_place(rgba(SOURCES/item("guide","检测报告")["source"]),-49,508)
    guide_place(rgba(SOURCES/item("guide",6)["source"]),136,116)
    # Hat and DHA must stay above the animated right paper.
    promoted=rgba(oldguide/"guide-foreground-top.webp")
    arr=np.asarray(promoted).copy(); keep=np.zeros(arr.shape[:2],dtype=bool)
    keep[420:700,80:700]=True
    keep &= ((arr[:,:,0]<125)&(arr[:,:,1]<125)&(arr[:,:,2]<125)) | ((arr[:,:,0]>210)&(arr[:,:,1]>100)&(arr[:,:,1]<235)&(arr[:,:,2]<175)&(arr[:,:,0].astype(int)-arr[:,:,1].astype(int)>20))
    arr[:,:,3]=np.where(keep,arr[:,:,3],0);fg.alpha_composite(Image.fromarray(arr))
    for n,x,y in [(9,628,381),(10,53,838),(11,229,947)]:guide_place(rgba(SOURCES/item("guide",n)["source"]),x,y)
    fg.save(guide_out/"guide-foreground-top.webp","WEBP",lossless=True,method=6)
    hint=rgba(SOURCES/item("guide","添加上下跳动的动效")["source"])
    hint.save(guide_out/"swipe-up-hint-v2.png")
    for mode in ["first-frame","static-foreground-v2"]:
        canvas=rgba(guide_out/"guide-background.webp")
        names=["guide-character-open","guide-window-mask","guide-arch"]
        if mode=="static-foreground-v2":names += [f"report-paper-{side}" for side in ["top","left","right","bottom"]]
        for name in names:canvas.alpha_composite(rgba(guide_out/f"{name}.webp"))
        canvas.alpha_composite(fg)
        if mode=="static-foreground-v2":canvas.alpha_composite(hint.resize((326,98),Image.Resampling.LANCZOS),(212,1473))
        canvas.save(guide_out/f"guide-{mode}.webp","WEBP",quality=94,method=6)
    save(ref("loading"),"loading-poster",750)

    # Each report card stays editable. Its independent original title and
    # description artwork supplies the default rendering; custom managed copy
    # can still be rendered as HTML in the same card slot.
    category_paper=save(rgba(SOURCES/"2-长图模块1/三个模块的底图（都是一样的）.jpg"),"category-paper",1000)
    specs={
      "inspection": {"slug":"inspection-projects","folder":83,"title":106,"footer":102,"cards":[[84,96,105,98,95,97,101],[85,92,104,94,91,93,100],[86,88,103,90,87,89,99]],"titles":["核心营养含量","油脂新鲜度","安全底线"],"descriptions":["每粒DHA和ARA的实测含量是多少","DHA是多不饱和脂肪酸，除了看含量，也要看PV过氧化值、AV酸价，避免食用过度氧化的藻油","把重金属、致病菌、呕吐毒素、塑化剂、防腐剂、溶剂残留放在一起看，食品安全无小事，这些看不见、闻不到的东西，我们用检测结果替妈妈把关"]},
      "review": {"slug":"review-assurance","folder":107,"title":108,"footer":127,"cards":[[126,123,130,125,122,124,121],[120,117,129,119,116,118,109],[114,111,128,113,110,112,115]],"titles":["非必要物质实测","原料与工艺","产品基础型检"],"descriptions":["包含EPA、肉豆蔻酸实测含量，总糖实测含量，避免宝宝摄入过多的非必要脂肪酸和糖分，让每口都是需要的营养","包含FMT580藻油原料COA、原料溯源。妈妈可以看到原料来自哪里","工厂出厂检测和第三方检测，双层兜底检测"]},
      "traceability": {"slug":"production-traceability","folder":131,"title":132,"footer":None,"cards":[[134,143,142,145,141,138,140],[133,137,None,139,136,144,135]],"titles":["生产资质","经营资质"],"descriptions":["确认生产方具备对应产品的生产许可、资质文件和基础生产条件",""]},
    }
    config["categories"]={}
    for name,spec in specs.items():
        reference=ref(name)
        layers=[{"id":"paper","src":category_paper,"x":0,"y":0,"width":2000,"height":4333},{"id":"folder",**save_part(name,spec["folder"])},{"id":"title",**save_part(name,spec["title"])}]
        if spec["footer"]:layers.append({"id":"footer-note",**save_part(name,spec["footer"])})
        cards=[]
        for i,(blank,title,description,button,search,label,arrow) in enumerate(spec["cards"]):
            # Source shapes and copy are 1:1 on the 2000px reference artboard.
            bx,by=(120,853+i*962) if i!=1 else (131,1819)
            if name=="traceability" and i==1:bx,by=134,1819
            if name=="traceability" and i==0:bx,by=121,852
            fix(name,blank,bx,by)
            title_y=item(name,title)["y"]
            desc_y=title_y+135
            if description:fix(name,description,254,desc_y if name!="traceability" else 1077)
            button_y=1337+i*961 if name!="traceability" else (1337 if i==0 else 2134)
            fix(name,button,239,button_y)
            fix(name,search,281,button_y+55)
            fix(name,label,395,button_y+45)
            if name=="inspection":fix(name,arrow,1175 if i<2 else 1223,[1186,2040,3087][i])
            # Use the supplied full-reference card edge where similar blank
            # exports cannot uniquely identify their placement by texture.
            p=item(name,blank)
            card={"x":bx/2,"y":by/2,"width":p["width"]/2,"height":p["height"]/2,"backplate":save_part(name,blank),"title":spec["titles"][i],"description":spec["descriptions"][i],"titleArtwork":save_part(name,title),"descriptionArtwork":save_part(name,description) if description else None,"controls":[save_part(name,n) for n in [button,search,label,arrow]]}
            cards.append(card)
        config["categories"][spec["slug"]]={"layers":layers,"cards":cards}
        preview=Image.new("RGBA",reference.size)
        # Compose from the same runtime pieces for visual registration QA.
        for layer in layers:
            im=rgba(ROOT/"public"/layer["src"].lstrip("/")).resize((layer["width"],layer["height"]),Image.Resampling.LANCZOS);preview.alpha_composite(im,(layer["x"],layer["y"]))
        for card in cards:
            for layer in [card["backplate"],card["titleArtwork"],card["descriptionArtwork"],*card["controls"]]:
                if not layer:continue
                im=rgba(ROOT/"public"/layer["src"].lstrip("/")).resize((layer["width"],layer["height"]),Image.Resampling.LANCZOS);preview.alpha_composite(im,(layer["x"],layer["y"]))
        preview.resize((750,1625)).save(QA/f"{name}-composed.png")

    complete=Image.new("RGBA",(2000,10783))
    for im,y in [(a1,0),(full,3733),(a3,7974)]:complete.alpha_composite(im,(0,y))
    config["archiveFallback"]=save(complete,"archive-reference",1000)
    module2_specs=[(3,"heading",None),(28,"inspection-paper",None),(26,"inspection-folder","inspection-projects"),(29,"inspection-mascot",None),(25,"review-folder","review-assurance"),(27,"production-paper",None),(24,"production-folder","production-traceability"),(23,"instructions",None)]
    config["archiveModule2"]=[{"id":f"module-2-{name}","slug":slug,**save_part("archive-2",n,offset=3733)} for n,name,slug in module2_specs]
    # Hit regions follow the visible original alpha contours, including the
    # tabs and the irregular overlap between folders, papers and the mascot.
    def alpha_on_canvas(n):
        mask=Image.new("L",(2000,4241));p=item("archive-2",n)
        mask.paste(part("archive-2",n).getchannel("A"),(p["x"],p["y"]))
        return np.asarray(mask)>24
    config["archiveFolderHotspots"]=[]
    for slug,n,occluders in [("inspection-projects",26,[29,25,27,24]),("review-assurance",25,[27,24]),("production-traceability",24,[])]:
        mask=alpha_on_canvas(n)
        for other in occluders:mask &= ~alpha_on_canvas(other)
        contours,_=cv2.findContours(mask.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        contour=max(contours,key=cv2.contourArea)
        contour=cv2.approxPolyDP(contour,2,True).reshape(-1,2)
        x,y,w,h=cv2.boundingRect(contour)
        points=[[round((int(px)-x)/w*100,4),round((int(py)-y)/h*100,4)] for px,py in contour]
        config["archiveFolderHotspots"].append({"slug":slug,"x":x,"y":y+3733,"width":w,"height":h,"points":points})
    config["archiveModule3"]= {"src":"/design/2026-09-07/runtime/archive-3-static.webp","x":0,"y":7974,"width":2000,"height":2809}
    (ROOT/"src/config/design-assets.generated.ts").write_text("// Generated by scripts/refresh-design-assets.py --build. Do not hand edit.\nexport const designAssets = "+json.dumps(config,ensure_ascii=False,indent=2)+" as const;\n",encoding="utf-8")
    for group in manifest["groups"].values():
        for placement in group["parts"].values():
            if placement["error"] is not None and not math.isfinite(placement["error"]):
                placement["error"]=None
                placement["registration"]="ambiguous; full reference used where needed"
    (OUTPUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2,allow_nan=False)+"\n",encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path)
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--fish-motion", action="store_true")
    parser.add_argument("--archive-entry", action="store_true")
    args = parser.parse_args()
    if args.build: build()
    elif args.fish_motion or args.archive_entry:
        target=ROOT/"src/config/design-assets.generated.ts"
        prefix="// Generated by scripts/refresh-design-assets.py --build. Do not hand edit.\nexport const designAssets = "
        config=json.loads(target.read_text(encoding="utf-8").split("export const designAssets = ",1)[1].removesuffix(" as const;\n"))
        if args.fish_motion: build_fish_motion(config)
        else: build_archive_entry(config,json.loads((OUTPUT/"manifest.json").read_text(encoding="utf-8")))
        target.write_text(prefix+json.dumps(config,ensure_ascii=False,indent=2)+" as const;\n",encoding="utf-8")
    else: inventory(args.source)
