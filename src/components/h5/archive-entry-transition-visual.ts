import { designAssets } from "@/config/design-assets.generated";
import { defaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";
import { batchArtworkSource, createBatchDetails } from "./archive-batch-details";
import { H5_MOTION_ENABLED, h5MotionModules } from "./motion/motion-config";

export const archiveEntryMasterWidth = designAssets.archiveWidth / 2;
export const archiveEntryMasterHeight = designAssets.archiveHeight / 2;
export const archiveEntryViewportOffset = 0;

export type ArchiveEntryLayer = {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  stack: number;
};

type SourcePart = { src: string; x: number; y: number; width: number; height: number };
const layer = (part: SourcePart, id: string, stack: number): ArchiveEntryLayer => ({ id, src: part.src, left: part.x / 2, top: part.y / 2, width: part.width / 2, height: part.height / 2, stack });

// Live rendering and the route handoff share one continuous book and a whole
// batch-card silhouette, so no rectangular page slice moves independently.
export const archiveEntryBookLayers = designAssets.archiveBook.map((part, index) => layer(part, `module-1-book-${index}`, 10));
export const archiveEntryBatchLayers = designAssets.archiveBatch.map((part, index) => layer(part, `module-1-batch-${index}`, 40));

export const archiveEntryPaperLayer: ArchiveEntryLayer = {
  id: "archive-paper-texture",
  src: designAssets.archivePaper,
  left: 0,
  top: 0,
  width: archiveEntryMasterWidth,
  height: archiveEntryMasterHeight,
  stack: 0,
};

export const archiveEntryRibbon = {
  src: designAssets.archiveRibbon.src,
  left: designAssets.archiveRibbon.x / 2,
  top: designAssets.archiveRibbon.y / 2,
  width: designAssets.archiveRibbon.width / 2,
  height: designAssets.archiveRibbon.height / 2,
  initialVisibleHeight: designAssets.archiveRibbon.height / 2,
} as const;

export const archiveEntryTransitionSources = [
  archiveEntryPaperLayer.src,
  ...archiveEntryBookLayers.map((item) => item.src),
  archiveEntryRibbon.src,
  ...archiveEntryBatchLayers.map((item) => item.src),
] as const;

type TransitionImageFactory = (src: string, className: string) => HTMLImageElement;

function defaultImageFactory(src: string, className: string) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = "";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.decoding = "async";
  image.dataset.decodeState = "loading";
  image.setAttribute("aria-hidden", "true");
  return image;
}

function setLayerGeometry(element: HTMLElement, item: Pick<ArchiveEntryLayer, "left" | "top" | "width" | "height" | "stack">) {
  element.style.left = `${item.left / archiveEntryMasterWidth * 100}%`;
  element.style.top = `${item.top / archiveEntryMasterHeight * 100}%`;
  element.style.width = `${item.width / archiveEntryMasterWidth * 100}%`;
  element.style.height = `${item.height / archiveEntryMasterHeight * 100}%`;
  element.style.zIndex = `${item.stack}`;
}

function createLayerImage(item: ArchiveEntryLayer, createImage: TransitionImageFactory) {
  const image = createImage(item.src, "h5-guide-archive-entry-layer");
  image.dataset.sourcePart = item.id;
  setLayerGeometry(image, item);
  return image;
}

export function createArchiveEntryTransitionVisual(createImage: TransitionImageFactory = defaultImageFactory, latestBatch: LatestBatch = defaultLatestBatch) {
  const visual = document.createElement("div");
  visual.className = "h5-guide-archive-entry-visual";
  visual.dataset.artworkSource = "layered-originals";
  visual.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("div");
  canvas.className = "h5-guide-archive-entry-canvas";

  const paper = createLayerImage(archiveEntryPaperLayer, createImage);
  paper.classList.add("is-paper");

  const book = document.createElement("div");
  book.className = "h5-guide-archive-entry-group is-book";
  book.dataset.guideDestinationGroup = "archive-book";
  for (const item of archiveEntryBookLayers) book.append(createLayerImage(item, createImage));

  const ribbonClip = document.createElement("div");
  ribbonClip.className = "h5-guide-archive-entry-ribbon-clip";
  ribbonClip.dataset.guideDestinationRibbon = "fixed";
  ribbonClip.dataset.unlockProgress = "1.000";
  // The live page owns the one-time slide after the guide handoff, avoiding
  // a visible static ribbon that disappears before its own entry starts.
  if (H5_MOTION_ENABLED && h5MotionModules.archiveUnlockTab) ribbonClip.dataset.ribbonEntryPending = "true";
  ribbonClip.style.setProperty(
    "--archive-entry-ribbon-hidden-bottom",
    `${(archiveEntryRibbon.height - archiveEntryRibbon.initialVisibleHeight) / archiveEntryRibbon.height * 100}%`,
  );
  setLayerGeometry(ribbonClip, { ...archiveEntryRibbon, stack: 20 });
  const ribbon = createImage(archiveEntryRibbon.src, "h5-guide-archive-entry-ribbon");
  ribbonClip.append(ribbon);
  book.append(ribbonClip);

  const batch = document.createElement("div");
  batch.className = "h5-guide-archive-entry-group is-batch";
  batch.dataset.guideDestinationGroup = "latest-batch";
  for (const item of archiveEntryBatchLayers) batch.append(createLayerImage({ ...item, src: batchArtworkSource(item.src, latestBatch) }, createImage));
  const details = createBatchDetails(latestBatch);
  if (details) batch.append(details);

  canvas.append(paper, book, batch);
  visual.append(canvas);
  return {
    visual,
    images: Array.from(visual.querySelectorAll<HTMLImageElement>("img")),
  };
}
