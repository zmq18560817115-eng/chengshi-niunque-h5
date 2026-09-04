export const archiveEntryMasterWidth = 1000;
export const archiveEntryMasterHeight = 5557;
export const archiveEntryViewportOffset = 216;

const archiveRuntimeRoot = "/design/final-v1/archive/runtime-layers";

export type ArchiveEntryLayer = {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  stack: number;
};

const layer = (
  id: string,
  left: number,
  top: number,
  width: number,
  height: number,
  stack: number,
): ArchiveEntryLayer => ({
  id,
  src: `${archiveRuntimeRoot}/${id}.runtime.webp`,
  left,
  top,
  width,
  height,
  stack,
});

// These positions are the approved module-one source bboxes on the 1000 x 5557
// archive master. The transition uses the same lossless runtime layers as the
// live archive instead of a flattened screenshot of its completed state.
export const archiveEntryBookLayers = [
  layer("module-1-folder-back", -288, 276, 1338, 1752, 10),
  layer("module-1-folder-front", -212, 262, 1160, 1676, 30),
  layer("module-1-logo", 69, 389, 260, 91, 40),
  layer("module-1-title", 41, 505, 632, 403, 40),
  layer("module-1-badge", 121, 591, 962, 1158, 40),
] as const;

export const archiveEntryBatchLayers = [
  layer("module-1-batch-coil", 22, 1582, 465, 100, 40),
  layer("module-1-batch", 57, 1602, 402, 158, 40),
  layer("module-1-passed-panel", -120, 1581, 904, 453, 40),
  layer("module-1-passed-copy", 63, 1821, 628, 113, 40),
] as const;

export const archiveEntryPaperLayer: ArchiveEntryLayer = {
  id: "archive-paper-texture",
  src: `${archiveRuntimeRoot}/archive-paper-texture.runtime.webp`,
  left: -11,
  top: 0,
  width: 1022,
  height: 7093,
  stack: 0,
};

export const archiveEntryRibbon = {
  src: "/design/final-v1/archive-unlock-ribbon.webp",
  left: 833.5,
  top: 1817,
  width: 96.5,
  height: 337,
  initialVisibleHeight: 43,
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

export function createArchiveEntryTransitionVisual(createImage: TransitionImageFactory = defaultImageFactory) {
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
  ribbonClip.dataset.guideDestinationRibbon = "idle";
  ribbonClip.dataset.unlockProgress = "0.000";
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
  for (const item of archiveEntryBatchLayers) batch.append(createLayerImage(item, createImage));

  canvas.append(paper, book, batch);
  visual.append(canvas);
  return {
    visual,
    images: Array.from(visual.querySelectorAll<HTMLImageElement>("img")),
  };
}
