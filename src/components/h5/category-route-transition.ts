export const categoryRouteEntryAttribute = "data-category-route-entry";
export const categoryRouteEntrySource = "reports-archive";
export const categoryRouteBufferedEntrySource = "reports-archive-buffer";
export const categoryRouteBufferAttribute = "data-category-route-buffer";
export const categoryRouteReadyEvent = "h5-category-route-ready";
export const categoryRouteBufferHostId = "h5-category-route-buffer-host";
export const archiveModuleExitDelayMs = 40;
export const archiveModuleExitDurationMs = 520;
export const archiveModuleNavigationDelayMs = 0;
export const categoryRouteBufferReleaseDurationMs = 1600;

let bufferCleanupTimer: number | undefined;

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

export function prepareCategoryRouteContinuity() {
  const root = document.documentElement;
  const host = document.getElementById(categoryRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".reports-archive-final");
  if (!host || !source) return;

  window.clearTimeout(bufferCleanupTimer);
  const sourceRect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove("is-leaving");
  clone.removeAttribute("data-exit-slug");
  clone.querySelectorAll(".archive-module-exit-layer").forEach((node) => node.classList.remove("archive-module-exit-layer"));
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
  buffer.className = "h5-category-route-buffer";
  buffer.setAttribute("aria-hidden", "true");
  buffer.append(clone);
  host.replaceChildren(buffer);
  root.setAttribute(categoryRouteBufferAttribute, "active");
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => buffer.classList.add("is-moving")));
}

function releaseCategoryRouteBuffer() {
  const root = document.documentElement;
  const buffer = document.querySelector<HTMLElement>(`#${categoryRouteBufferHostId} > .h5-category-route-buffer`);
  if (!buffer) {
    root.removeAttribute(categoryRouteBufferAttribute);
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    buffer.classList.add("is-releasing");
    bufferCleanupTimer = window.setTimeout(() => {
      buffer.remove();
      root.removeAttribute(categoryRouteBufferAttribute);
    }, categoryRouteBufferReleaseDurationMs + 120);
  }));
}

export function navigateWithCategoryContinuity(navigate: () => void) {
  if (!document.documentElement.hasAttribute(categoryRouteBufferAttribute)) prepareCategoryRouteContinuity();
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener(categoryRouteReadyEvent, finish);
    releaseCategoryRouteBuffer();
  };
  const fallbackTimer = window.setTimeout(finish, 12000);
  window.addEventListener(categoryRouteReadyEvent, finish, { once: true });
  navigate();
}

export function announceCategoryRouteReady() {
  window.dispatchEvent(new Event(categoryRouteReadyEvent));
}
