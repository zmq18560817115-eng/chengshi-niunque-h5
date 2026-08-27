import { requestVisualViewportHeightSync } from "@/components/h5/useVisualViewportHeight";

export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 16;
export const guideRouteBufferReleaseDurationMs = 520;
const guideRouteSnapshotSrc = "/design/guide/guide-final-fallback-v3.webp";

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

export function prepareGuideRouteContinuity() {
  const root = document.documentElement;
  const host = document.getElementById(guideRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".brand-guide");
  const sourceStage = source?.querySelector<HTMLElement>(".brand-guide-stage");
  if (!host || !source || !sourceStage) return;

  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  const sourceRect = source.getBoundingClientRect();
  const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));
  root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);
  root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);
  const stageRect = sourceStage.getBoundingClientRect();
  const snapshot = document.createElement("img");
  snapshot.className = "h5-guide-route-snapshot";
  snapshot.src = guideRouteSnapshotSrc;
  snapshot.alt = "";
  snapshot.decoding = "async";
  snapshot.setAttribute("aria-hidden", "true");
  Object.assign(snapshot.style, {
    left: `${stageRect.left}px`,
    top: `${stageRect.top}px`,
    width: `${stageRect.width}px`,
    height: `${stageRect.height}px`,
  });

  const buffer = document.createElement("div");
  buffer.className = "h5-guide-route-buffer";
  buffer.setAttribute("aria-hidden", "true");
  buffer.append(snapshot);
  host.replaceChildren(buffer);
  root.setAttribute(guideRouteEntryAttribute, "active");
}

function revealGuideDestination() {
  const root = document.documentElement;
  const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`);
  window.requestAnimationFrame(() => {
    root.setAttribute(guideRouteEntryAttribute, "revealing");
    buffer?.classList.add("is-releasing");
    bufferCleanupTimer = window.setTimeout(() => buffer?.remove(), guideRouteBufferReleaseDurationMs + 80);
    stageCleanupTimer = window.setTimeout(() => {
      root.removeAttribute(guideRouteEntryAttribute);
      root.style.removeProperty("--guide-route-travel-distance");
      root.style.removeProperty("--guide-route-exit-distance");
      requestVisualViewportHeightSync();
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    }, guideRouteStageDurationMs);
  });
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
  document.getElementById(guideRouteBufferHostId)?.replaceChildren();
  document.documentElement.removeAttribute(guideRouteEntryAttribute);
  document.documentElement.style.removeProperty("--guide-route-travel-distance");
  document.documentElement.style.removeProperty("--guide-route-exit-distance");
  requestVisualViewportHeightSync();
}
