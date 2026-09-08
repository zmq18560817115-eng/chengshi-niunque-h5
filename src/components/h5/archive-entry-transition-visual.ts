import { designAssets } from "@/config/design-assets.generated";
import { defaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";
import { batchArtworkSource, createBatchDetails } from "./archive-batch-details";
import { H5_MOTION_ENABLED, h5MotionModules } from "./motion/motion-config";
import type { CSSProperties } from "react";

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

// The supplied complete book already contains resource 4. Cover that printed
// copy using the same book's adjacent yellow edge and the original gold strap.
// Both the live page and every handoff/fallback use this stationary backing;
// resource 4 itself is rendered only by the independent entrance layer.
export const archiveRibbonBacking = {
  left: 1841, top: 2501, width: 166, height: 613,
  donorTop: 3120, tileHeight: 100,
  book: designAssets.archiveBook[0],
  strap: {
    src: "/design/2026-09-07/source/2-长图模块1/长图模块一，部件/资源 24.png",
    x: 206, y: 470, width: 2037, height: 2527,
  },
} as const;

export function getArchiveRibbonBackingStyles() {
  const { left, top, width, height, donorTop, tileHeight, book, strap } = archiveRibbonBacking;
  return {
    clip: {
      left: `${left / designAssets.archiveWidth * 100}%`,
      top: `${top / designAssets.archiveHeight * 100}%`,
      width: `${width / designAssets.archiveWidth * 100}%`,
      height: `${height / designAssets.archiveHeight * 100}%`,
    } as CSSProperties,
    tiles: Array.from({ length: Math.ceil(height / tileHeight) }, (_, index) => ({
      top: `${index * tileHeight / height * 100}%`,
      height: `${tileHeight / height * 100}%`,
      backgroundImage: `url("${book.src}")`,
      backgroundSize: `${book.width / width * 100}% ${book.height / tileHeight * 100}%`,
      backgroundPosition: `${left / (book.width - width) * 100}% ${donorTop / (book.height - tileHeight) * 100}%`,
    } as CSSProperties)),
    strap: {
      left: `${(strap.x - left) / width * 100}%`,
      top: `${(strap.y - top) / height * 100}%`,
      width: `${strap.width / width * 100}%`,
      height: `${strap.height / height * 100}%`,
    } as CSSProperties,
  };
}

export const archiveEntryTransitionSources = [
  archiveEntryPaperLayer.src,
  ...archiveEntryBookLayers.map((item) => item.src),
  archiveEntryRibbon.src,
  archiveRibbonBacking.strap.src,
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

function createRibbonBacking(createImage: TransitionImageFactory) {
  const styles = getArchiveRibbonBackingStyles();
  const backing = document.createElement("div");
  backing.className = "archive-ribbon-backing";
  Object.assign(backing.style, styles.clip);
  for (const style of styles.tiles) {
    const tile = document.createElement("div");
    tile.className = "archive-ribbon-backing-texture";
    Object.assign(tile.style, style);
    backing.append(tile);
  }
  const strap = createImage(archiveRibbonBacking.strap.src, "archive-ribbon-backing-strap");
  Object.assign(strap.style, styles.strap);
  backing.append(strap);
  return backing;
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
  book.append(createRibbonBacking(createImage));

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
