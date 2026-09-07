import { designAssets } from "@/config/design-assets.generated";
import Image from "next/image";
import { memo, type CSSProperties } from "react";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { ArchiveFolderPaperMotion } from "@/components/h5/motion/modules/ArchiveFolderPaperMotion";
import { defaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";
import { ArchiveBatchDetails } from "./ArchiveBatchDetails";
import { ArchiveRibbonBacking } from "./ArchiveRibbonBacking";
import { batchArtworkSource } from "./archive-batch-details";
import {
  archiveEntryMasterWidth,
  archiveEntryMasterHeight,
  archiveEntryBatchLayers,
  archiveEntryBookLayers,
  archiveEntryPaperLayer,
  archiveRibbonBacking,
} from "@/components/h5/archive-entry-transition-visual";

const masterWidth = archiveEntryMasterWidth;
const masterHeight = archiveEntryMasterHeight;
type ArtworkLayer = { id: string; src: string; left: number; top: number; width: number; height: number; eager?: boolean; unoptimized?: boolean };
const layerModule: Record<string, string> = {
  "module-2-inspection-folder": "inspection-projects",
  "module-2-review-folder": "review-assurance",
  "module-2-production-folder": "production-traceability",
};
const sourceLayer = (part: { src: string; x: number; y: number; width: number; height: number }, id: string): ArtworkLayer => ({ id, src: part.src, left: part.x / 2, top: part.y / 2, width: part.width / 2, height: part.height / 2, unoptimized: true });
const artworkLayers: readonly ArtworkLayer[] = [
  { ...archiveEntryPaperLayer, id: "paper-texture", eager: true, unoptimized: true },
  ...archiveEntryBookLayers.map((part) => ({ ...part, eager: true, unoptimized: true })),
  ...archiveEntryBatchLayers.map((part) => ({ ...part, eager: true, unoptimized: true })),
  ...designAssets.archiveModule2.map((part) => sourceLayer(part, part.id)),
  sourceLayer(designAssets.archiveModule3, "module-3-complete-output"),
];

const layerStyle = ({ left, top, width, height }: ArtworkLayer): CSSProperties => ({
  left: `${left / masterWidth * 100}%`,
  top: `${top / masterHeight * 100}%`,
  width: `${width / masterWidth * 100}%`,
  height: `${height / masterHeight * 100}%`,
});

const layerStack = (id: string) => {
  if (id === "paper-texture") return 0;
  if (id.startsWith("module-1-book-")) return 10;
  if (id === "module-1-folder-back") return 10;
  if (id === "module-1-folder-front") return 30;
  return 40;
};

const guideEntryBookParts = new Set(archiveEntryBookLayers.map((part) => part.id));
const guideEntryBatchParts = new Set(archiveEntryBatchLayers.map((part) => part.id));
const layerEntryStage = (id: string) => id === "paper-texture" ? 0 : guideEntryBookParts.has(id) ? 1 : guideEntryBatchParts.has(id) ? 3 : 4;
export const archiveArtworkWarmAssets = [...artworkLayers.map((layer) => layer.src), archiveRibbonBacking.strap.src];
export const archiveArtworkCriticalAssets = [...artworkLayers.filter((layer) => layerEntryStage(layer.id) <= 3).map((layer) => layer.src), archiveRibbonBacking.strap.src];
export const archiveArtworkDeferredAssets = artworkLayers.filter((layer) => layerEntryStage(layer.id) > 3).map((layer) => layer.src);
const deepDeferredParts = new Set(["module-2-review-folder", "module-2-production-folder", "module-3-complete-output"]);
const risingPaperParts = new Set(["module-2-inspection-paper", "module-2-production-paper"]);

// 按压高亮改由 CSS 依据 <main data-pressed-slug> + 图层 data-archive-module 驱动
// (见 globals.css),这样点按只更新父级一个属性,无需重渲染这棵庞大的贴图树。
// 路由退场由完整首页缓冲层统一承接，不再单独抽走大面积文件夹图层。
export const ArchiveArtwork = memo(function ArchiveArtwork({ preview = false, mountDeferred = true, mountDeepDeferred = true, paperMotionReady = false, ribbonMotionReady = false, latestBatch = defaultLatestBatch }: { preview?: boolean; mountDeferred?: boolean; mountDeepDeferred?: boolean; paperMotionReady?: boolean; ribbonMotionReady?: boolean; latestBatch?: LatestBatch }) {
  const renderLayer = (layer: ArtworkLayer) => {
    const moduleSlug = layerModule[layer.id as keyof typeof layerModule];
    const src = guideEntryBatchParts.has(layer.id) ? batchArtworkSource(layer.src, latestBatch) : layer.src;
    const risingPaper = risingPaperParts.has(layer.id);
    const image = (
      <Image
        key={`${layer.id}:${src}`}
        className="reports-archive-source-layer"
        src={src}
        alt=""
        width={layer.width}
        height={layer.height}
        style={risingPaper ? { inset: 0, width: "100%", height: "100%" } : { ...layerStyle(layer), zIndex: layerStack(layer.id) }}
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
    return risingPaper ? <ArchiveFolderPaperMotion key={layer.id} id={layer.id} ready={paperMotionReady} preview={preview} style={{ ...layerStyle(layer), zIndex: layerStack(layer.id) }}>{image}</ArchiveFolderPaperMotion> : image;
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
          <ArchiveRibbonBacking />
          <ArchiveUnlockTabMotion preview={preview} active={ribbonMotionReady} />
        </div>
      </div>
      <div className="reports-archive-entry-group reports-archive-entry-batch" data-guide-entry-group="latest-batch">
        <div className="reports-archive-entry-coordinate-layer">
          {batchLayers.map(renderLayer)}
          <ArchiveBatchDetails value={latestBatch}/>
        </div>
      </div>
    </div>
  );
});
