export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 40;
export const guideRouteBufferReleaseDurationMs = 220;
export const guideRouteStageDurationMs = 680;

let bufferCleanupTimer: number | undefined;
let stageCleanupTimer: number | undefined;

const freezeProperties = [
  "opacity",
  "transform",
  "visibility",
  "clip-path",
  "mask-position",
  "-webkit-mask-position",
  "stroke-dashoffset",
] as const;

function freezeClone(source: HTMLElement, clone: HTMLElement) {
  const sourceNodes = [source, ...source.querySelectorAll<HTMLElement | SVGElement>("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll<HTMLElement | SVGElement>("*")];
  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;
    const computed = window.getComputedStyle(sourceNode);
    cloneNode.style.setProperty("animation", "none", "important");
    cloneNode.style.setProperty("transition", "none", "important");
    freezeProperties.forEach((property) => cloneNode.style.setProperty(property, computed.getPropertyValue(property), "important"));
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
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove("is-leaving");
  freezeClone(source, clone);
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
  root.setAttribute(guideRouteEntryAttribute, "revealing");
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => buffer?.classList.add("is-releasing")));
  bufferCleanupTimer = window.setTimeout(() => buffer?.remove(), guideRouteBufferReleaseDurationMs + 80);
  stageCleanupTimer = window.setTimeout(() => root.removeAttribute(guideRouteEntryAttribute), guideRouteStageDurationMs);
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
}
