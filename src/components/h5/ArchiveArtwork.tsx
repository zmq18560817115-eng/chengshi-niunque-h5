import Image from "next/image";
import type { CSSProperties } from "react";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";

const masterWidth = 1000;
const masterHeight = 5557;
const archiveOutputRoot = "/design/final-v1/长图输出";
const paperTexture = `${archiveOutputRoot}/三个模块共同的底图（肌理）/底图纹理.png`;
const moduleOneAsset = (name: string) => `${archiveOutputRoot}/长图模块1/${name}`;
const moduleTwoAsset = (name: string) => `${archiveOutputRoot}/长图模块2/${name}`;
const moduleThreeOutput = "/design/final-v1/长图输出/完整长图-共三个模块_04.jpg";

const layerModule = {
  "module-2-inspection-folder": "inspection-projects",
  "module-2-review-folder": "review-assurance",
  "module-2-production-folder": "production-traceability",
} as const;

type ArtworkLayer = {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  eager?: boolean;
  unoptimized?: boolean;
};

const atHalfSize = (id: string, src: string, sourceWidth: number, sourceHeight: number, left: number, top: number, unoptimized = true): ArtworkLayer => ({
  id,
  src,
  left,
  top,
  width: sourceWidth / 2,
  height: sourceHeight / 2,
  unoptimized,
});

const moduleOneTransform = { left: -406, top: 0, width: 1517, height: 2167 } as const;
const moduleOneLayer = (id: string, name: string): ArtworkLayer => ({ id, src: moduleOneAsset(name), ...moduleOneTransform, eager: true });

// The order is the original visual stacking order. Resources 4–7 are the
// retired plant decoration. Resources 11–19 move to the title-motion layer,
// where the number pairs are restored and the static titles are replaced.
const artworkLayers: readonly ArtworkLayer[] = [
  { id: "paper-texture", src: paperTexture, left: -11, top: 0, width: 1022, height: 7093, eager: true },

  moduleOneLayer("module-1-folder-back", "h5长图-文件夹底.png"),
  moduleOneLayer("module-1-folder-front", "h5长图1.png"),
  moduleOneLayer("module-1-logo", "h5长图-品牌logo.png"),
  moduleOneLayer("module-1-title", "h5长图-诚实档案标题.png"),
  moduleOneLayer("module-1-badge", "h5长图-工牌.png"),
  moduleOneLayer("module-1-batch-coil", "h5长图-最新公开批次信息-线圈.png"),
  moduleOneLayer("module-1-batch", "h5长图-最新公开批次信息.png"),
  moduleOneLayer("module-1-passed-panel", "h5长图-已通过模块.png"),
  moduleOneLayer("module-1-passed-copy", "h5长图-已通过模块文案.png"),
  atHalfSize("module-2-resource-02", moduleTwoAsset("资源 2.png"), 1244, 715, 190.5, 2247.5),
  atHalfSize("module-2-resource-03", moduleTwoAsset("资源 3.png"), 215, 251, 696, 2199),
  atHalfSize("module-2-resource-08", moduleTwoAsset("资源 8.png"), 1101, 1216, 51, 2624),
  atHalfSize("module-2-inspection-folder", moduleTwoAsset("绿档.png"), 2893, 4572, -270, 2162, false),
  atHalfSize("module-2-resource-10", moduleTwoAsset("资源 10.png"), 334, 165, 172, 3044.5),
  atHalfSize("module-2-resource-09", moduleTwoAsset("资源 9.png"), 1201, 1274, 410, 2936.5),
  atHalfSize("module-2-review-folder", moduleTwoAsset("黄档.png"), 2893, 4572, -260, 2162, false),
  atHalfSize("module-2-resource-20", moduleTwoAsset("资源 20.png"), 1296, 1108, 18.5, 3349),
  atHalfSize("module-2-production-folder", moduleTwoAsset("棕档.png"), 2893, 4572, -262, 2162, false),
  atHalfSize("module-2-resource-21", moduleTwoAsset("资源 21.png"), 1457, 543, 135.5, 3827),

  { id: "module-3-complete-output", src: moduleThreeOutput, left: 0, top: 4374.5, width: 1000, height: 1182.5, unoptimized: true },
] as const;

export const archiveArtworkWarmAssets = artworkLayers.map((layer) => layer.src);

const layerStyle = ({ left, top, width, height }: ArtworkLayer): CSSProperties => ({
  left: `${left / masterWidth * 100}%`,
  top: `${top / masterHeight * 100}%`,
  width: `${width / masterWidth * 100}%`,
  height: `${height / masterHeight * 100}%`,
});

const layerStack = (id: string) => {
  if (id === "paper-texture") return 0;
  if (id === "module-1-folder-back") return 10;
  if (id === "module-1-folder-front") return 30;
  return 40;
};

export function ArchiveArtwork({ preview = false, exitingSlug = null }: { preview?: boolean; exitingSlug?: string | null }) {
  return (
    <div className="reports-archive-art reports-archive-source-art" role="img" aria-label="诚实透明档案" data-artwork-source="layered-originals">
      {artworkLayers.map((layer) => {
        const moduleSlug = layerModule[layer.id as keyof typeof layerModule];
        const exiting = moduleSlug === exitingSlug;
        return (
        <Image
          key={layer.id}
          className={`reports-archive-source-layer ${exiting ? "archive-module-exit-layer" : ""}`}
          src={layer.src}
          alt=""
          width={layer.width}
          height={layer.height}
          style={{ ...layerStyle(layer), zIndex: layerStack(layer.id) }}
          sizes="(max-width: 750px) 150vw, 1125px"
          priority={Boolean(layer.eager)}
          loading={layer.eager ? undefined : "lazy"}
          unoptimized={layer.unoptimized}
          data-source-part={layer.id}
          data-archive-module={moduleSlug}
        />
        );
      })}
      <ArchiveUnlockTabMotion preview={preview} />
    </div>
  );
}
