from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/input/design/final-v1/archive-档案首页"
OUTPUT = ROOT / "public/design/final-v1/motion/archive-clean"
REFERENCE = ROOT / "public/design/final-v1/archive-reference.webp"
STORY_INITIAL = ROOT / "public/design/final-v1/motion/archive-story-copy/archive-story-base.webp"
MASTER = (1000, 5557)
DESIGN_CROP = (652, 408, 2652, 4336)
MODULE_ONE_SIZE = (1000, 1964)
# The legacy full-page base contains a second baked purple report tab below
# module one through y=2144. Restore official paper texture through 2160 while
# leaving the following three-evidence title untouched.
MODULE_ONE_REPLACE_END = 2160
MODULE_THREE_Y = 4164
MODULE_THREE_SIZE = (1000, 1393)


def transform_module_one(name: str) -> Image.Image:
    image = Image.open(SOURCE / "长图模块1" / name).convert("RGBA")
    if image.size != (3034, 4334):
        raise ValueError(f"unexpected module-one canvas: {name} {image.size}")
    return image.crop(DESIGN_CROP).resize(MODULE_ONE_SIZE, Image.Resampling.LANCZOS)


def alpha_composite(canvas: Image.Image, layer: Image.Image, xy=(0, 0)) -> None:
    canvas.alpha_composite(layer, xy)


def connected_boxes(mask: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    seen = np.zeros(mask.shape, dtype=bool)
    boxes: list[tuple[int, int, int, int, int]] = []
    height, width = mask.shape
    for y, x in zip(*np.nonzero(mask & ~seen), strict=True):
        if seen[y, x]:
            continue
        queue = deque([(x, y)])
        seen[y, x] = True
        xs: list[int] = []
        ys: list[int] = []
        while queue:
            cx, cy = queue.popleft()
            xs.append(cx)
            ys.append(cy)
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((nx, ny))
        if len(xs) >= 80:
            boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs)))
    return boxes


def match_layer(reference: Image.Image, layer: Image.Image, approximate_x: int, approximate_y: int) -> tuple[int, int]:
    target = np.asarray(reference.convert("RGB"), dtype=np.int16)
    rgba = np.asarray(layer, dtype=np.uint8)
    visible = rgba[:, :, 3] > 96
    source_rgb = rgba[:, :, :3].astype(np.int16)
    best: tuple[float, int, int] | None = None
    for y in range(max(0, approximate_y - 45), min(target.shape[0] - layer.height, approximate_y + 46)):
        for x in range(max(0, approximate_x - 45), min(target.shape[1] - layer.width, approximate_x + 46)):
            sample = target[y:y + layer.height, x:x + layer.width]
            score = float(np.abs(sample[visible] - source_rgb[visible]).mean())
            if best is None or score < best[0]:
                best = (score, x, y)
    if best is None:
        raise ValueError("layer matching produced no candidates")
    return best[1], best[2]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    reference = Image.open(REFERENCE).convert("RGBA")
    if reference.size != MASTER:
        raise ValueError(f"unexpected archive reference: {reference.size}")

    # Rebuild module one from the official common texture and the official
    # 3034x4334 layers. All layers share DESIGN_CROP and one runtime origin.
    texture_source = Image.open(SOURCE / "三个模块共同的底图（肌理）" / "底图纹理.png").convert("RGB")
    texture = texture_source.resize((1000, round(texture_source.height * 1000 / texture_source.width)), Image.Resampling.LANCZOS)
    module_one = texture.crop((0, 0, 1000, MODULE_ONE_SIZE[1])).convert("RGBA")
    for name in (
        "h5长图-文件夹底.png",
        "h5长图1.png",
        "h5长图-品牌logo.png",
        "h5长图-诚实档案标题.png",
        "h5长图-工牌.png",
        "h5长图-最新公开批次信息.png",
        "h5长图-已通过模块.png",
        "h5长图-已通过模块文案-无绿色字.png",
    ):
        alpha_composite(module_one, transform_module_one(name))

    # The initial unlock state is an independent full-master canvas. Keep it
    # out of the clean base so loading/idle/revealing never render two tabs.
    unlock = transform_module_one("h5长图-下滑条.png")
    unlock_bbox = unlock.getchannel("A").getbbox()
    if unlock_bbox is None:
        raise ValueError("unlock layer has no visible pixels")
    head_height = max(1, round((unlock_bbox[3] - unlock_bbox[1]) * 0.2))
    unlock_head = Image.new("RGBA", MODULE_ONE_SIZE)
    unlock_head.alpha_composite(unlock.crop((0, unlock_bbox[1], 1000, unlock_bbox[1] + head_height)), (0, unlock_bbox[1]))

    clean = Image.open(STORY_INITIAL).convert("RGBA")
    clean.paste(module_one, (0, 0))
    clean.paste(texture.crop((0, MODULE_ONE_SIZE[1], 1000, MODULE_ONE_REPLACE_END)), (0, MODULE_ONE_SIZE[1]))

    # Locate the four supplied fish from their actual yellow pixel components
    # in the official final reference. This records pixel-derived master
    # coordinates and avoids per-viewport or percentage positioning.
    module_three = np.asarray(reference.crop((0, MODULE_THREE_Y, 1000, MODULE_THREE_Y + 280)).convert("RGB"))
    yellow = (module_three[:, :, 0] > 215) & (module_three[:, :, 1] > 155) & (module_three[:, :, 1] < 235) & (module_three[:, :, 2] < 145)
    candidates = [box for box in connected_boxes(yellow) if 35 <= box[2] - box[0] <= 170 and 18 <= box[3] - box[1] <= 100]
    candidates.sort(key=lambda box: box[0])
    if len(candidates) < 4:
        raise ValueError(f"could not derive four fish positions: {candidates}")
    fish_boxes = candidates[:4]

    fish_canvases: list[Image.Image] = []
    fish_sources = [Image.open(SOURCE / "长图模块3" / f"资源 {index}.png").convert("RGBA") for index in range(1, 5)]
    # The source fish are 2x runtime artwork. Align their visible bounds to the
    # detected final-reference bounds, preserving aspect ratio and alpha.
    for index, (source, detected) in enumerate(zip(fish_sources, fish_boxes, strict=True), start=1):
        bbox = source.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"fish {index} has no alpha content")
        tight = source.crop(bbox)
        x1, y1, x2, y2, _ = detected
        target_width = round(tight.width * 0.5)
        target_height = round(tight.height * 0.5)
        runtime = tight.resize((target_width, target_height), Image.Resampling.LANCZOS)
        approximate_x = round((x1 + x2 - target_width) / 2)
        approximate_y = MODULE_THREE_Y + round((y1 + y2 - target_height) / 2)
        x, y = match_layer(reference, runtime, approximate_x, approximate_y)
        canvas = Image.new("RGBA", MASTER)
        canvas.alpha_composite(runtime, (x, y))
        fish_canvases.append(canvas)

        # Restore the official common paper texture only under the exact fish
        # alpha footprint. Other module-three artwork stays untouched.
        texture_patch = texture.crop((x, y, x + target_width, y + target_height)).convert("RGBA")
        mask = runtime.getchannel("A")
        clean.paste(texture_patch, (x, y), mask)

    clean.save(OUTPUT / "archive-base-clean.webp", "WEBP", lossless=True, method=6)
    unlock_head_canvas = Image.new("RGBA", MASTER)
    unlock_head_canvas.alpha_composite(unlock_head)
    unlock_head_canvas.save(OUTPUT / "archive-unlock-tab-head-canvas.webp", "WEBP", lossless=True, method=6)
    for name, source_name in (
        ("archive-latest-circle-canvas.webp", "h5长图-最新公开批次信息-线圈.png"),
        ("archive-unlock-tab-canvas.webp", "h5长图-下滑条.png"),
        ("archive-result-normal-canvas.webp", "h5长图-已通过模块文案-无绿色字.png"),
        ("archive-result-passed-canvas.webp", "h5长图-已通过模块文案.png"),
    ):
        canvas = Image.new("RGBA", MASTER)
        canvas.alpha_composite(transform_module_one(source_name))
        canvas.save(OUTPUT / name, "WEBP", lossless=True, method=6)
    for index, canvas in enumerate(fish_canvases, start=1):
        canvas.save(OUTPUT / f"archive-fish-{index:02d}-canvas.webp", "WEBP", lossless=True, method=6)

    story_runtime = ROOT / "public/design/final-v1/motion/archive-story-copy"
    story_placements = json.loads((story_runtime / "placements.json").read_text(encoding="utf-8"))["lines"]
    for placement in story_placements:
        line = Image.open(story_runtime / f"{placement['name']}.webp").convert("RGBA")
        canvas = Image.new("RGBA", MASTER)
        canvas.alpha_composite(line.resize((placement["width"], placement["height"]), Image.Resampling.LANCZOS), (placement["x"], placement["y"]))
        canvas.save(OUTPUT / f"{placement['name']}-canvas.webp", "WEBP", lossless=True, method=6)

    manifest = {
        "master": {"width": 1000, "height": 5557},
        "moduleOne": {"sourceCrop": DESIGN_CROP, "runtimeBounds": [0, 0, 1000, 1964]},
        "unlockInitialVisibleRatio": 0.2,
        "fish": [
            {"index": index, "detectedBox": [int(value) for value in box[:4]], "canvasAlphaBounds": fish_canvases[index - 1].getchannel("A").getbbox()}
            for index, box in enumerate(fish_boxes, start=1)
        ],
    }
    (OUTPUT / "mapping.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
