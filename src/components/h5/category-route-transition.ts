export const categoryRouteEntryAttribute = "data-category-route-entry";
export const categoryRouteEntrySource = "reports-archive";
export const categoryRouteOverlapEntrySource = "reports-archive-overlap";
export const categoryViewTransitionAttribute = "data-category-view-transition";
export const categoryRouteReadyEvent = "h5-category-route-ready";
export const archiveModuleExitDelayMs = 40;
export const archiveModuleExitDurationMs = 520;
export const archiveModuleNavigationDelayMs = 300;

type H5ViewTransition = { finished: Promise<void> };
type H5ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => H5ViewTransition;
};

export function navigateWithCategoryContinuity(navigate: () => void) {
  const root = document.documentElement;
  const viewTransitionDocument = document as H5ViewTransitionDocument;
  const startViewTransition = viewTransitionDocument.startViewTransition;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (!startViewTransition || reducedMotion) {
    navigate();
    return;
  }

  root.setAttribute(categoryViewTransitionAttribute, "active");
  const routeReady = new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener(categoryRouteReadyEvent, finish);
      resolve();
    };
    const fallbackTimer = window.setTimeout(finish, 1600);
    window.addEventListener(categoryRouteReadyEvent, finish, { once: true });
  });

  const transition = startViewTransition.call(viewTransitionDocument, async () => {
    navigate();
    await routeReady;
  });
  transition.finished.finally(() => root.removeAttribute(categoryViewTransitionAttribute)).catch(() => undefined);
}

export function announceCategoryRouteReady() {
  window.dispatchEvent(new Event(categoryRouteReadyEvent));
}
