import { requestVisualViewportHeightSync } from "@/components/h5/useVisualViewportHeight";

export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 16;
export const guideRouteBufferReleaseDurationMs = 520;
export const guideRouteCommitDurationMs = 520;
export const guideRouteAssetTimeoutMs = 4000;
export const guideRouteSnapshotSrc = "/design/guide/guide-final-fallback-v3.webp";
export const guideRouteForegroundSrc = "/design/guide/guide-foreground-top.webp";
export const guideRouteHintSrc = "/design/guide/swipe-up-hint-v2.png";
export const guideTransitionTravelRatio = 0.26;
export const guideRouteLandscapeSnapshotSrc = "/design/guide/guide-landscape-composition.webp";
export const guideRouteDestinationSrc = "/design/final-v1/archive-reference-public.webp";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

export function getGuideTransitionVisualState(progressValue: number, viewportHeight: number) {
  const progress = clamp(progressValue);
  const travel = Math.max(1, viewportHeight) * guideTransitionTravelRatio;
  const destinationOpacity = smoothstep(progress / 0.7);
  const guideOpacity = 1 - 0.92 * smoothstep((progress - 0.3) / 0.7);
  return {
    progress,
    guideY: -travel * progress,
    destinationY: travel * (1 - progress),
    guideOpacity,
    destinationOpacity,
    overlapRatio: 1 - guideTransitionTravelRatio,
  };
}

export const guideArchiveEntryTiming = {
  bookDelayMs: 0,
  bookDurationMs: 520,
  batchOverlapProgress: 0.72,
  batchDurationMs: 420,
} as const;

export const guideArchiveBatchDelayMs = guideArchiveEntryTiming.bookDelayMs
  + guideArchiveEntryTiming.bookDurationMs * guideArchiveEntryTiming.batchOverlapProgress;
export const guideRouteStageDurationMs = guideArchiveBatchDelayMs
  + guideArchiveEntryTiming.batchDurationMs
  + 80;

let bufferCleanupTimer: number | undefined;
let stageCleanupTimer: number | undefined;
let revealDelayTimer: number | undefined;
let bufferCommitReadyAt = 0;
let cancelPendingPreparation: (() => void) | undefined;

type RouteImageOutcome = "ready" | "failed";

function loadAndDecodeRouteImage(image: HTMLImageElement, src: string) {
  let settled = false;
  let decoding = false;
  let timeoutId = 0;
  let resolveOutcome!: (outcome: RouteImageOutcome) => void;
  const promise = new Promise<RouteImageOutcome>((resolve) => { resolveOutcome = resolve; });
  const settle = (outcome: RouteImageOutcome) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    image.removeEventListener("load", decodeLoadedImage);
    image.removeEventListener("error", fail);
    image.dataset.decodeState = outcome;
    resolveOutcome(outcome);
  };
  const fail = () => settle("failed");
  const decodeLoadedImage = () => {
    if (settled || decoding) return;
    if (image.naturalWidth <= 0) {
      fail();
      return;
    }
    decoding = true;
    const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
    void decoded.then(
      () => settle(image.naturalWidth > 0 ? "ready" : "failed"),
      fail,
    );
  };
  image.dataset.decodeState = "loading";
  image.addEventListener("load", decodeLoadedImage);
  image.addEventListener("error", fail);
  image.src = src;
  timeoutId = window.setTimeout(fail, guideRouteAssetTimeoutMs);
  if (image.complete) queueMicrotask(decodeLoadedImage);
  return { promise, cancel: fail };
}

export function prepareGuideRouteContinuity(initialProgress = 0, destinationFallback = false): Promise<void> {
  const root = document.documentElement;
  const host = document.getElementById(guideRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".brand-guide");
  const sourceStage = source?.querySelector<HTMLElement>(".brand-guide-stage");
  const sourceFrame = source?.querySelector<HTMLElement>(".brand-guide-swipe-track");
  if (!host || !source || !sourceStage || !sourceFrame) return Promise.resolve();

  cancelPendingPreparation?.();
  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  const sourceRect = source.getBoundingClientRect();
  const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));
  const start = getGuideTransitionVisualState(initialProgress, routeDistance);
  const end = getGuideTransitionVisualState(1, routeDistance);
  const progress = start.progress;
  const remainingDistance = Math.max(0, Math.round(routeDistance * (1 - progress)));
  const commitDuration = Math.max(160, Math.round(guideRouteCommitDurationMs * (1 - progress)));
  root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);
  root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);
  root.style.setProperty("--guide-route-remaining-distance", `${remainingDistance}px`);
  const frameRect = sourceFrame.getBoundingClientRect();
  const snapshot = document.createElement("div");
  snapshot.className = "h5-guide-route-snapshot";
  snapshot.setAttribute("aria-hidden", "true");

  const snapshotImage = document.createElement("img");
  snapshotImage.className = "h5-guide-route-portrait-snapshot";
  snapshotImage.alt = "";
  snapshotImage.loading = "eager";
  snapshotImage.fetchPriority = "high";
  snapshotImage.decoding = "async";
  snapshotImage.setAttribute("aria-hidden", "true");
  snapshot.append(snapshotImage);

  const destination = document.createElement("img");
  destination.className = "h5-guide-route-destination-image";
  destination.alt = "";
  destination.loading = "eager";
  destination.fetchPriority = "high";
  destination.decoding = "async";
  destination.setAttribute("aria-hidden", "true");

  const guidePanel = document.createElement("div");
  guidePanel.className = "h5-guide-route-panel h5-guide-route-guide-panel";
  guidePanel.append(snapshot);
  const destinationPanel = document.createElement("div");
  destinationPanel.className = "h5-guide-route-panel h5-guide-route-destination-panel";
  const destinationContent = document.createElement("div");
  destinationContent.className = "h5-guide-route-destination-content";
  destinationContent.append(destination);
  destinationPanel.append(destinationContent);
  const track = document.createElement("div");
  track.className = "h5-guide-route-track";
  Object.assign(track.style, {
    left: `${frameRect.left}px`,
    top: `${frameRect.top}px`,
    width: `${frameRect.width}px`,
    height: `${frameRect.height}px`,
  });
  track.append(guidePanel, destinationPanel);

  const buffer = document.createElement("div");
  buffer.className = `h5-guide-route-buffer${destinationFallback ? " has-destination-fallback" : ""}`;
  buffer.setAttribute("aria-hidden", "true");
  buffer.style.setProperty("--guide-route-start-guide-y", `${start.guideY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-start-destination-y", `${start.destinationY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-end-guide-y", `${end.guideY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-start-guide-opacity", `${start.guideOpacity.toFixed(4)}`);
  buffer.style.setProperty("--guide-route-start-destination-opacity", `${start.destinationOpacity.toFixed(4)}`);
  buffer.style.setProperty("--guide-route-commit-duration", `${commitDuration}ms`);
  buffer.dataset.commitState = "waiting-for-decoded-images";
  buffer.append(track);

  const landscapeSnapshot = window.matchMedia?.("(orientation: landscape) and (max-height: 500px)").matches ?? false;
  const snapshotLoad = loadAndDecodeRouteImage(snapshotImage, landscapeSnapshot ? guideRouteLandscapeSnapshotSrc : guideRouteSnapshotSrc);
  const destinationLoad = destinationFallback
    ? (() => {
        destination.src = guideRouteDestinationSrc;
        destination.dataset.decodeState = "failed";
        return { promise: Promise.resolve<RouteImageOutcome>("failed"), cancel: () => undefined };
      })()
    : loadAndDecodeRouteImage(destination, guideRouteDestinationSrc);

  let cancelled = false;
  let activated = false;
  let resolveActivated!: () => void;
  const activation = new Promise<void>((resolve) => { resolveActivated = resolve; });
  const cancel = () => {
    if (cancelled || activated) return;
    cancelled = true;
    snapshotLoad.cancel();
    destinationLoad.cancel();
    resolveActivated();
  };
  cancelPendingPreparation = cancel;

  void Promise.all([snapshotLoad.promise, destinationLoad.promise]).then(([snapshotOutcome, destinationOutcome]) => {
    if (cancelled) return;
    activated = true;
    if (cancelPendingPreparation === cancel) cancelPendingPreparation = undefined;
    if (destinationOutcome === "failed") {
      buffer.classList.add("has-destination-fallback");
      buffer.dataset.destinationState = "fallback";
    } else {
      buffer.dataset.destinationState = "decoded";
    }
    if (snapshotOutcome === "failed") {
      // If the guide poster itself cannot be decoded, switch directly to the
      // already-decoded destination (or its explicit error card). This avoids
      // ever replacing live guide content with a texture-only panel.
      snapshot.remove();
      buffer.dataset.sourceState = "fallback";
      buffer.style.setProperty("--guide-route-start-guide-opacity", "0");
      buffer.style.setProperty("--guide-route-start-destination-opacity", "1");
    } else {
      buffer.dataset.sourceState = "decoded";
    }
    host.replaceChildren(buffer);
    root.setAttribute(guideRouteEntryAttribute, "active");
    bufferCommitReadyAt = 0;
    resolveActivated();
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (!buffer.isConnected) return;
      buffer.dataset.commitState = "committing";
      bufferCommitReadyAt = performance.now() + commitDuration;
      buffer.classList.add("is-committing");
      if (buffer.dataset.revealPending === "true") {
        delete buffer.dataset.revealPending;
        revealGuideDestination();
      }
    }));
  });
  return activation;
}

function revealGuideDestination() {
  const root = document.documentElement;
  const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`);
  if (buffer && !buffer.classList.contains("is-committing")) {
    // The destination route can announce readiness in the narrow interval
    // between buffer activation and its first composited transition frame.
    // Hold that reveal until commit has genuinely started.
    buffer.dataset.revealPending = "true";
    return;
  }
  const release = () => window.requestAnimationFrame(() => {
      root.setAttribute(guideRouteEntryAttribute, "revealing");
      buffer?.classList.add("is-releasing");
      bufferCleanupTimer = window.setTimeout(() => buffer?.remove(), guideRouteBufferReleaseDurationMs + 80);
      stageCleanupTimer = window.setTimeout(() => {
        root.removeAttribute(guideRouteEntryAttribute);
        root.style.removeProperty("--guide-route-travel-distance");
        root.style.removeProperty("--guide-route-exit-distance");
        root.style.removeProperty("--guide-route-remaining-distance");
        requestVisualViewportHeightSync();
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo(0, 0);
        window.requestAnimationFrame(() => window.scrollTo(0, 0));
      }, guideRouteStageDurationMs);
    });
  const remainingCommitMs = Math.max(0, bufferCommitReadyAt - performance.now());
  if (remainingCommitMs > 0) revealDelayTimer = window.setTimeout(release, remainingCommitMs);
  else release();
}

export function navigateWithGuideContinuity(navigate: () => void) {
  const beginNavigation = () => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener(guideRouteReadyEvent, finish);
      revealGuideDestination();
    };
    const fallbackTimer = window.setTimeout(finish, 12000);
    window.addEventListener(guideRouteReadyEvent, finish, { once: true });
    navigate();
  };
  if (document.documentElement.hasAttribute(guideRouteEntryAttribute)) beginNavigation();
  else void prepareGuideRouteContinuity().then(beginNavigation);
}

export function announceGuideRouteReady() {
  window.dispatchEvent(new Event(guideRouteReadyEvent));
}

export function clearGuideRouteContinuity() {
  cancelPendingPreparation?.();
  cancelPendingPreparation = undefined;
  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  bufferCommitReadyAt = 0;
  document.getElementById(guideRouteBufferHostId)?.replaceChildren();
  document.documentElement.removeAttribute(guideRouteEntryAttribute);
  document.documentElement.style.removeProperty("--guide-route-travel-distance");
  document.documentElement.style.removeProperty("--guide-route-exit-distance");
  document.documentElement.style.removeProperty("--guide-route-remaining-distance");
  requestVisualViewportHeightSync();
}
