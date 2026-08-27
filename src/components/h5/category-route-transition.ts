export const categoryRouteEntryAttribute = "data-category-route-entry";
export const categoryRouteEntrySource = "reports-archive";
export const categoryRouteBufferedEntrySource = "reports-archive-buffer";
export const categoryRouteBufferAttribute = "data-category-route-buffer";
export const categoryRouteNativeTransitionAttribute = "data-category-native-transition";
export const categoryRouteReadyEvent = "h5-category-route-ready";
export const categoryRouteMountedEvent = "h5-category-route-mounted";
export const categoryRouteBufferHostId = "h5-category-route-buffer-host";
// Keep one short, perceptible pressed frame for touch and keyboard activation
// before the compositor transition takes ownership of the route.
export const archiveModuleExitDelayMs = 16;
export const archiveModuleExitDurationMs = 420;
export const archiveModuleNavigationDelayMs = 0;
export const categoryRouteBufferReleaseDurationMs = 520;

let bufferCleanupTimer: number | undefined;

type CategoryViewTransition = { finished: Promise<unknown> };
type CategoryViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => CategoryViewTransition;
};

export function prepareCategoryRouteContinuity() {
  const root = document.documentElement;
  const host = document.getElementById(categoryRouteBufferHostId);
  if (!host) return;

  window.clearTimeout(bufferCleanupTimer);
  const buffer = document.createElement("div");
  buffer.className = "h5-category-route-buffer";
  buffer.setAttribute("aria-hidden", "true");
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
  const root = document.documentElement;
  const viewDocument = document as CategoryViewTransitionDocument;
  const startViewTransition = viewDocument.startViewTransition?.bind(viewDocument);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (startViewTransition && !reducedMotion) {
    let settled = false;
    let resolveMounted: (() => void) | undefined;
    const mounted = new Promise<void>((resolve) => { resolveMounted = resolve; });
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener(categoryRouteMountedEvent, finish);
      resolveMounted?.();
    };
    const fallbackTimer = window.setTimeout(finish, 3000);
    window.addEventListener(categoryRouteMountedEvent, finish, { once: true });
    root.setAttribute(categoryRouteNativeTransitionAttribute, "active");
    try {
      const transition = startViewTransition(async () => {
        navigate();
        await mounted;
      });
      const clearNativeTransition = () => root.removeAttribute(categoryRouteNativeTransitionAttribute);
      void transition.finished.then(clearNativeTransition, clearNativeTransition);
      return;
    } catch {
      finish();
      root.removeAttribute(categoryRouteNativeTransitionAttribute);
    }
  }

  if (!root.hasAttribute(categoryRouteBufferAttribute)) prepareCategoryRouteContinuity();
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
