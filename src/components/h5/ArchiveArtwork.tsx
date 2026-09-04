import Image from "next/image";
import { memo, type CSSProperties } from "react";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import {
  archiveEntryBatchLayers,
  archiveEntryBookLayers,
  archiveEntryPaperLayer,
} from "@/components/h5/archive-entry-transition-visual";

const masterWidth = 1000;
const masterHeight = 5557;
const archiveOutputRoot = "/design/final-v1/长图输出";
const archiveRuntimeRoot = "/design/final-v1/archive/runtime-layers";
const runtimeAsset = (name: string) => `${archiveRuntimeRoot}/${name}`;
const moduleTwoAsset = (name: string) => `${archiveOutputRoot}/长图模块2/${name}`;
const moduleThreeOutput = `${archiveRuntimeRoot}/module-3-output.webp`;

const layerModule = {
  "module-2-inspection-folder": "inspection-projects",
  // The approved mascot/card artwork belongs to the green inspection module,
  // even though its lower edge visually crosses the yellow folder boundary.
  "module-2-resource-09": "inspection-projects",
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

type AlphaCrop = { x: number; y: number; width: number; height: number };
const alphaCroppedLayer = (id: string, src: string, originalLeft: number, originalTop: number, scale: number, crop: AlphaCrop, eager = false): ArtworkLayer => ({
  id,
  src,
  left: originalLeft + crop.x * scale,
  top: originalTop + crop.y * scale,
  width: crop.width * scale,
  height: crop.height * scale,
  eager,
  unoptimized: true,
});
const entryLayer = (item: (typeof archiveEntryBookLayers)[number] | (typeof archiveEntryBatchLayers)[number]): ArtworkLayer => ({
  ...item,
  eager: true,
  unoptimized: true,
});

// The order is the original visual stacking order. Resources 4–7 are the
// retired plant decoration. Resources 11–19 move to the title-motion layer,
// where the number pairs are restored and the static titles are replaced.
const artworkLayers: readonly ArtworkLayer[] = [
  { ...archiveEntryPaperLayer, id: "paper-texture", eager: true, unoptimized: true },
  ...archiveEntryBookLayers.map(entryLayer),
  ...archiveEntryBatchLayers.map(entryLayer),
  atHalfSize("module-2-resource-02", moduleTwoAsset("资源 2.png"), 1244, 715, 190.5, 2247.5),
  atHalfSize("module-2-resource-03", moduleTwoAsset("资源 3.png"), 215, 251, 696, 2199),
  atHalfSize("module-2-resource-08", moduleTwoAsset("资源 8.png"), 1101, 1216, 51, 2624),
  alphaCroppedLayer("module-2-inspection-folder", runtimeAsset("module-2-inspection-folder.runtime.webp"), -270, 2162, .5, { x: 283, y: 1167, width: 2326, height: 2981 }),
  atHalfSize("module-2-resource-10", moduleTwoAsset("资源 10.png"), 334, 165, 172, 3044.5),
  atHalfSize("module-2-resource-09", moduleTwoAsset("资源 9.png"), 1201, 1274, 410, 2936.5),
  alphaCroppedLayer("module-2-review-folder", runtimeAsset("module-2-review-folder.runtime.webp"), -260, 2162, .5, { x: 283, y: 1928, width: 2326, height: 2202 }),
  atHalfSize("module-2-resource-20", moduleTwoAsset("资源 20.png"), 1296, 1108, 18.5, 3349),
  alphaCroppedLayer("module-2-production-folder", runtimeAsset("module-2-production-folder.runtime.webp"), -262, 2162, .5, { x: 283, y: 2641, width: 2326, height: 1743 }),
  alphaCroppedLayer("module-2-resource-21", runtimeAsset("module-2-resource-21.runtime.webp"), 135.5, 3827, .5, { x: 4, y: 4, width: 1398, height: 529 }),

  { id: "module-3-complete-output", src: moduleThreeOutput, left: 0, top: 4374.5, width: 1000, height: 1182.5, unoptimized: true },
] as const;

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

const layerEntryStage = (id: string) => {
  if (id === "paper-texture") return 0;
  if (id === "module-1-folder-back" || id === "module-1-folder-front") return 1;
  if (id === "module-1-logo" || id === "module-1-title" || id === "module-1-badge") return 2;
  if (id.startsWith("module-1-batch") || id.startsWith("module-1-passed")) return 3;
  return 4;
};

export const archiveArtworkWarmAssets = artworkLayers.map((layer) => layer.src);
export const archiveArtworkCriticalAssets = artworkLayers.filter((layer) => layerEntryStage(layer.id) <= 3).map((layer) => layer.src);
export const archiveArtworkDeferredAssets = artworkLayers.filter((layer) => layerEntryStage(layer.id) > 3).map((layer) => layer.src);

const guideEntryBookParts = new Set([
  "module-1-folder-back",
  "module-1-folder-front",
  "module-1-logo",
  "module-1-title",
  "module-1-badge",
]);
const guideEntryBatchParts = new Set([
  "module-1-batch-coil",
  "module-1-batch",
  "module-1-passed-panel",
  "module-1-passed-copy",
]);

const deepDeferredParts = new Set([
  "module-2-review-folder",
  "module-2-resource-20",
  "module-2-production-folder",
  "module-2-resource-21",
  "module-3-complete-output",
]);

// 按压高亮改由 CSS 依据 <main data-pressed-slug> + 图层 data-archive-module 驱动
// (见 globals.css),这样点按只更新父级一个属性,无需重渲染这棵庞大的贴图树,
// 点击反馈即时、不再卡顿。此组件仅在真正导航(exitingSlug 变化)时才需重渲染,
// 因此用 memo 包裹,按压 pressedSlug 变化不会触及它。
export const ArchiveArtwork = memo(function ArchiveArtwork({ preview = false, exitingSlug = null, mountDeferred = true, mountDeepDeferred = true }: { preview?: boolean; exitingSlug?: string | null; mountDeferred?: boolean; mountDeepDeferred?: boolean }) {
  const renderLayer = (layer: ArtworkLayer) => {
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
        fetchPriority={layer.eager ? "high" : "low"}
        loading="eager"
        unoptimized={layer.unoptimized}
        data-source-part={layer.id}
        data-archive-module={moduleSlug}
        data-guide-entry-stage={layerEntryStage(layer.id)}
      />
    );
  };

  const baseLayers = artworkLayers.filter((layer) => !guideEntryBookParts.has(layer.id)
    && !guideEntryBatchParts.has(layer.id)
    && (layerEntryStage(layer.id) <= 3
      || (mountDeferred && !deepDeferredParts.has(layer.id))
      || (mountDeepDeferred && deepDeferredParts.has(layer.id))));
  const bookLayers = artworkLayers.filter((layer) => guideEntryBookParts.has(layer.id));
  const batchLayers = artworkLayers.filter((layer) => guideEntryBatchParts.has(layer.id));

  return (
    <div className="reports-archive-art reports-archive-source-art" role="img" aria-label="诚实透明档案" data-artwork-source="layered-originals">
      {baseLayers.map(renderLayer)}
      <div className="reports-archive-entry-group reports-archive-entry-book" data-guide-entry-group="archive-book">
        <div className="reports-archive-entry-coordinate-layer">
          {bookLayers.map(renderLayer)}
          <ArchiveUnlockTabMotion preview={preview} />
        </div>
      </div>
      <div className="reports-archive-entry-group reports-archive-entry-batch" data-guide-entry-group="latest-batch">
        <div className="reports-archive-entry-coordinate-layer">
          {batchLayers.map(renderLayer)}
        </div>
      </div>
    </div>
  );
});
