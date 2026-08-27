import Image from "next/image";
import { memo, type CSSProperties } from "react";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";

const masterWidth = 1000;
const masterHeight = 5557;
const archiveOutputRoot = "/design/final-v1/长图输出";
const archiveRuntimeRoot = "/design/final-v1/archive/runtime-layers";
const paperTexture = `${archiveRuntimeRoot}/archive-paper-texture.webp`;
const moduleOneAsset = (name: string) => `${archiveRuntimeRoot}/${name}`;
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

const moduleOneTransform = { left: -406, top: 0, width: 1517, height: 2167 } as const;
const moduleOneLayer = (id: string, name: string): ArtworkLayer => ({ id, src: moduleOneAsset(name), ...moduleOneTransform, eager: true, unoptimized: true });

// The order is the original visual stacking order. Resources 4–7 are the
// retired plant decoration. Resources 11–19 move to the title-motion layer,
// where the number pairs are restored and the static titles are replaced.
const artworkLayers: readonly ArtworkLayer[] = [
  { id: "paper-texture", src: paperTexture, left: -11, top: 0, width: 1022, height: 7093, eager: true, unoptimized: true },

  moduleOneLayer("module-1-folder-back", "module-1-folder-back.webp"),
  moduleOneLayer("module-1-folder-front", "module-1-folder-front.webp"),
  moduleOneLayer("module-1-logo", "module-1-logo.webp"),
  moduleOneLayer("module-1-title", "module-1-title.webp"),
  moduleOneLayer("module-1-badge", "module-1-badge.webp"),
  moduleOneLayer("module-1-batch-coil", "module-1-batch-coil.webp"),
  moduleOneLayer("module-1-batch", "module-1-batch.webp"),
  moduleOneLayer("module-1-passed-panel", "module-1-passed-panel.webp"),
  moduleOneLayer("module-1-passed-copy", "module-1-passed-copy.webp"),
  atHalfSize("module-2-resource-02", moduleTwoAsset("资源 2.png"), 1244, 715, 190.5, 2247.5),
  atHalfSize("module-2-resource-03", moduleTwoAsset("资源 3.png"), 215, 251, 696, 2199),
  atHalfSize("module-2-resource-08", moduleTwoAsset("资源 8.png"), 1101, 1216, 51, 2624),
  atHalfSize("module-2-inspection-folder", moduleTwoAsset("绿档.png"), 2893, 4572, -270, 2162),
  atHalfSize("module-2-resource-10", moduleTwoAsset("资源 10.png"), 334, 165, 172, 3044.5),
  atHalfSize("module-2-resource-09", moduleTwoAsset("资源 9.png"), 1201, 1274, 410, 2936.5),
  atHalfSize("module-2-review-folder", moduleTwoAsset("黄档.png"), 2893, 4572, -260, 2162),
  atHalfSize("module-2-resource-20", moduleTwoAsset("资源 20.png"), 1296, 1108, 18.5, 3349),
  atHalfSize("module-2-production-folder", moduleTwoAsset("棕档.png"), 2893, 4572, -262, 2162),
  atHalfSize("module-2-resource-21", moduleTwoAsset("资源 21.png"), 1457, 543, 135.5, 3827),

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
        loading={layer.eager ? undefined : "lazy"}
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
