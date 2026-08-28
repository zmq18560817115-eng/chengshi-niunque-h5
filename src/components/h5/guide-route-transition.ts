import { requestVisualViewportHeightSync } from "@/components/h5/useVisualViewportHeight";

export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 16;
export const guideRouteBufferReleaseDurationMs = 520;
export const guideRouteCommitDurationMs = 520;
export const guideRouteSnapshotSrc = "/design/guide/guide-final-fallback-v3.webp";
export const guideRouteDestinationSrc = "/design/final-v1/archive-reference.webp";

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

export function prepareGuideRouteContinuity(initialProgress = 0, destinationFallback = false) {
  const root = document.documentElement;
  const host = document.getElementById(guideRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".brand-guide");
  const sourceStage = source?.querySelector<HTMLElement>(".brand-guide-stage");
  if (!host || !source || !sourceStage) return;

  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  const sourceRect = source.getBoundingClientRect();
  const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));
  const progress = Math.min(1, Math.max(0, initialProgress));
  const startOffset = -(routeDistance * progress);
  const remainingDistance = Math.max(0, Math.round(routeDistance * (1 - progress)));
  const commitDuration = Math.max(160, Math.round(guideRouteCommitDurationMs * (1 - progress)));
  root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);
  root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);
  root.style.setProperty("--guide-route-remaining-distance", `${remainingDistance}px`);
  const stageRect = sourceStage.getBoundingClientRect();
  const snapshot = document.createElement("img");
  snapshot.className = "h5-guide-route-snapshot";
  snapshot.src = guideRouteSnapshotSrc;
  snapshot.alt = "";
  snapshot.loading = "eager";
  snapshot.fetchPriority = "high";
  snapshot.decoding = "async";
  snapshot.setAttribute("aria-hidden", "true");
  Object.assign(snapshot.style, {
    left: `${stageRect.left}px`,
    // getBoundingClientRect already includes the live swipe-track transform.
    // Remove it here because the continuity track reapplies the same offset.
    top: `${stageRect.top - startOffset}px`,
    width: `${stageRect.width}px`,
    height: `${stageRect.height}px`,
  });

  const destination = document.createElement("img");
  destination.className = "h5-guide-route-destination-image";
  destination.src = guideRouteDestinationSrc;
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
  destinationPanel.append(destination);
  const track = document.createElement("div");
  track.className = "h5-guide-route-track";
  track.append(guidePanel, destinationPanel);

  const buffer = document.createElement("div");
  buffer.className = `h5-guide-route-buffer${destinationFallback ? " has-destination-fallback" : ""}`;
  buffer.setAttribute("aria-hidden", "true");
  buffer.style.setProperty("--guide-route-start-offset", `${startOffset.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-start-guide-opacity", `${Math.max(0.08, 1 - progress * 0.92).toFixed(4)}`);
  buffer.style.setProperty("--guide-route-start-destination-opacity", `${Math.min(1, 0.18 + progress * 1.64).toFixed(4)}`);
  buffer.style.setProperty("--guide-route-commit-duration", `${commitDuration}ms`);
  buffer.append(track);
  host.replaceChildren(buffer);
  root.setAttribute(guideRouteEntryAttribute, "active");
  bufferCommitReadyAt = performance.now() + commitDuration;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => buffer.classList.add("is-committing")));
}

function revealGuideDestination() {
  const root = document.documentElement;
  const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`);
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
  if (!document.documentElement.hasAttribute(guideRouteEntryAttribute)) prepareGuideRouteContinuity();
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
}

export function announceGuideRouteReady() {
  window.dispatchEvent(new Event(guideRouteReadyEvent));
}

export function clearGuideRouteContinuity() {
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
