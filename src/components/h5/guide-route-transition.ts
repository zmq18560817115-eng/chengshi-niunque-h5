import { requestVisualViewportHeightSync } from "@/components/h5/useVisualViewportHeight";

export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 40;
export const guideRouteBufferReleaseDurationMs = 840;

export const guideArchiveEntryTiming = {
  bookDelayMs: 0,
  bookDurationMs: 840,
  batchOverlapProgress: 0.8,
  batchDurationMs: 620,
} as const;

export const guideArchiveBatchDelayMs = guideArchiveEntryTiming.bookDelayMs
  + guideArchiveEntryTiming.bookDurationMs * guideArchiveEntryTiming.batchOverlapProgress;
export const guideRouteStageDurationMs = guideArchiveBatchDelayMs
  + guideArchiveEntryTiming.batchDurationMs
  + 80;

let bufferCleanupTimer: number | undefined;
let stageCleanupTimer: number | undefined;

const guideSnapshotSelectors = [
  ".brand-guide-paper-top",
  ".brand-guide-paper-left",
  ".brand-guide-paper-right",
  ".brand-guide-paper-bottom",
  ".brand-guide-character-closed",
] as const;

function freezeGuideSnapshot(source: HTMLElement, clone: HTMLElement) {
  guideSnapshotSelectors.forEach((selector) => {
    const sourceNode = source.querySelector<HTMLElement>(selector);
    const cloneNode = clone.querySelector<HTMLElement>(selector);
    if (!sourceNode || !cloneNode) return;
    const computed = window.getComputedStyle(sourceNode);
    cloneNode.style.setProperty("opacity", computed.opacity, "important");
    cloneNode.style.setProperty("transform", computed.transform, "important");
  });
}

export function prepareGuideRouteContinuity() {
  const root = document.documentElement;
  const host = document.getElementById(guideRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".brand-guide");
  if (!host || !source) return;

  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  const sourceRect = source.getBoundingClientRect();
  const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));
  root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);
  root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove("is-leaving");
  clone.classList.add("is-guide-route-buffer-clone", "is-swipe-accepted");
  freezeGuideSnapshot(source, clone);
  Object.assign(clone.style, {
    position: "absolute",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    maxWidth: "none",
    margin: "0",
    pointerEvents: "none",
  });

  const buffer = document.createElement("div");
  buffer.className = "h5-guide-route-buffer";
  buffer.setAttribute("aria-hidden", "true");
  buffer.append(clone);
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
