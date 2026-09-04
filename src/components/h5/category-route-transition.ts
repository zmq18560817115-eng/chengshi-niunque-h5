export const categoryRouteEntryAttribute = "data-category-route-entry";
export const categoryRouteAttemptAttribute = "data-category-route-attempt";
export const categoryRouteEntrySource = "reports-archive";
export const categoryRouteBufferedEntrySource = "reports-archive-buffer";
export const categoryRouteNativeEntrySource = "reports-archive-native";
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
export const categoryRouteReadyTimeoutMs = 3400;
export const categoryRouteCommitTimeoutMs = 5000;

type CategoryRouteReadyStatus = "ready" | "failed";
export type CategoryRouteReadyDetail = {
  attemptId: string;
  slug: string;
  status: CategoryRouteReadyStatus;
};

type CategoryViewTransition = {
  finished: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
  skipTransition?: () => void;
};
type CategoryViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => CategoryViewTransition;
};

type ReadyLatch = {
  promise: Promise<void>;
  settle: () => void;
  wasMounted: () => boolean;
};

const frozenVisualProperties = [
  "opacity",
  "visibility",
  "transform",
  "translate",
  "scale",
  "rotate",
  "filter",
  "clip-path",
  "mask-image",
  "mask-position",
  "mask-size",
  "-webkit-mask-image",
  "-webkit-mask-position",
  "-webkit-mask-size",
  "stroke-dasharray",
  "stroke-dashoffset",
] as const;

let attemptSequence = 0;
let bufferGeneration = 0;
let bufferCleanupTimer: number | undefined;
let bufferAnimationFrames: number[] = [];
let activeReadyLatch: ReadyLatch | undefined;

function createAttemptId() {
  attemptSequence += 1;
  return `category-${Date.now().toString(36)}-${attemptSequence.toString(36)}`;
}

function clearBufferSchedules() {
  window.clearTimeout(bufferCleanupTimer);
  bufferCleanupTimer = undefined;
  bufferAnimationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
  bufferAnimationFrames = [];
}

function queueBufferFrame(callback: FrameRequestCallback) {
  const frame = window.requestAnimationFrame((time) => {
    bufferAnimationFrames = bufferAnimationFrames.filter((queued) => queued !== frame);
    callback(time);
  });
  bufferAnimationFrames.push(frame);
  return frame;
}

function isCurrentBuffer(host: HTMLElement, buffer: HTMLElement, generation: number) {
  return generation === bufferGeneration && host.firstElementChild === buffer;
}

function clearAttemptMarkers(attemptId: string) {
  const root = document.documentElement;
  if (root.getAttribute(categoryRouteAttemptAttribute) !== attemptId) return;
  root.removeAttribute(categoryRouteAttemptAttribute);
  if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
    root.removeAttribute(categoryRouteNativeTransitionAttribute);
  }
}

function freezeCloneMotion(source: HTMLElement, clone: HTMLElement) {
  // Freeze both page-level entry timelines before the clone is inserted.
  // Otherwise the cloned root and artwork restart from opacity:0 even though
  // all approved source layers were already decoded and painted.
  const selector = ".reports-archive-art, [data-motion-module], [data-motion-module] *";
  const sourceNodes = [source, ...source.querySelectorAll<Element>(selector)];
  const cloneNodes = [clone, ...clone.querySelectorAll<Element>(selector)];
  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index] as (Element & ElementCSSInlineStyle) | undefined;
    if (!cloneNode?.style) return;
    const computed = window.getComputedStyle(sourceNode);
    frozenVisualProperties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) cloneNode.style.setProperty(property, value);
    });
    cloneNode.style.setProperty("animation", "none", "important");
    cloneNode.style.setProperty("transition", "none", "important");
    cloneNode.style.setProperty("will-change", "auto", "important");
  });
}

function disposeCategoryRouteAttempt(attemptId: string) {
  const root = document.documentElement;
  if (root.getAttribute(categoryRouteAttemptAttribute) !== attemptId) return;
  clearBufferSchedules();
  bufferGeneration += 1;
  document.getElementById(categoryRouteBufferHostId)?.replaceChildren();
  root.removeAttribute(categoryRouteBufferAttribute);
  root.removeAttribute(categoryRouteAttemptAttribute);
  if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
    root.removeAttribute(categoryRouteNativeTransitionAttribute);
  }
}

function createReadyLatch(detail: Pick<CategoryRouteReadyDetail, "attemptId" | "slug">) {
  activeReadyLatch?.settle();
  let settled = false;
  let mounted = false;
  let resolveReady: (() => void) | undefined;
  let fallbackTimer: number | undefined;
  const promise = new Promise<void>((resolve) => { resolveReady = resolve; });
  let settle: () => void = () => undefined;
  const armFallback = (delayMs: number) => {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(() => settle(), delayMs);
  };
  const matchesAttempt = (event: Event) => {
    if (!(event instanceof CustomEvent)) return false;
    const payload = event.detail as Partial<CategoryRouteReadyDetail> | undefined;
    return payload?.attemptId === detail.attemptId && payload.slug === detail.slug;
  };
  const onReady = (event: Event) => {
    if (!matchesAttempt(event)) return;
    settle();
  };
  const onMounted = (event: Event) => {
    if (!matchesAttempt(event)) return;
    mounted = true;
    // Asset readiness has its own 3s fail-open measured from target mount.
    // Restart this guard here so a slow route commit cannot expose the target
    // before its visible artwork has either decoded or failed open.
    armFallback(categoryRouteReadyTimeoutMs);
  };
  const onPageHide = () => {
    settle();
    disposeCategoryRouteAttempt(detail.attemptId);
  };
  settle = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener(categoryRouteReadyEvent, onReady);
    window.removeEventListener(categoryRouteMountedEvent, onMounted);
    window.removeEventListener("pagehide", onPageHide);
    if (activeReadyLatch?.promise === promise) activeReadyLatch = undefined;
    resolveReady?.();
  };
  window.addEventListener(categoryRouteReadyEvent, onReady);
  window.addEventListener(categoryRouteMountedEvent, onMounted);
  window.addEventListener("pagehide", onPageHide, { once: true });
  armFallback(categoryRouteCommitTimeoutMs);
  const latch = { promise, settle, wasMounted: () => mounted };
  activeReadyLatch = latch;
  return latch;
}

export function prepareCategoryRouteContinuity(attemptId = createAttemptId()) {
  const root = document.documentElement;
  const host = document.getElementById(categoryRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".reports-archive-final");
  if (!host || !source) return false;

  clearBufferSchedules();
  const generation = ++bufferGeneration;
  const sourceRect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove("is-leaving");
  clone.classList.add("is-category-route-buffer-clone");
  clone.removeAttribute("aria-busy");
  clone.removeAttribute("data-exit-slug");
  freezeCloneMotion(source, clone);
  clone.querySelector(".reports-archive-hotspots")?.remove();
  clone.querySelectorAll(".archive-module-exit-layer").forEach((node) => node.classList.remove("archive-module-exit-layer"));
  Object.assign(clone.style, {
    position: "absolute",
    inset: "auto",
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
  buffer.dataset.routeAttempt = attemptId;
  buffer.dataset.routeGeneration = String(generation);
  buffer.setAttribute("aria-hidden", "true");
  buffer.append(clone);
  host.replaceChildren(buffer);
  root.removeAttribute(categoryRouteNativeTransitionAttribute);
  root.setAttribute(categoryRouteAttemptAttribute, attemptId);
  root.setAttribute(categoryRouteBufferAttribute, "active");
  queueBufferFrame(() => {
    if (!isCurrentBuffer(host, buffer, generation)) return;
    queueBufferFrame(() => {
      if (isCurrentBuffer(host, buffer, generation)) buffer.classList.add("is-moving");
    });
  });
  return true;
}

function releaseCategoryRouteBuffer(attemptId: string, revealLoadingBeforeRelease = false) {
  const root = document.documentElement;
  const host = document.getElementById(categoryRouteBufferHostId);
  const buffer = host?.querySelector<HTMLElement>(":scope > .h5-category-route-buffer");
  if (!host || !buffer || buffer.dataset.routeAttempt !== attemptId) {
    if (!host?.firstElementChild) root.removeAttribute(categoryRouteBufferAttribute);
    clearAttemptMarkers(attemptId);
    return;
  }

  clearBufferSchedules();
  const generation = Number(buffer.dataset.routeGeneration);
  if (revealLoadingBeforeRelease) root.removeAttribute(categoryRouteBufferAttribute);
  queueBufferFrame(() => {
    if (!isCurrentBuffer(host, buffer, generation)) return;
    queueBufferFrame(() => {
      if (!isCurrentBuffer(host, buffer, generation)) return;
      buffer.classList.add("is-releasing");
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const cleanupDelay = (reducedMotion ? 180 : categoryRouteBufferReleaseDurationMs) + 120;
      bufferCleanupTimer = window.setTimeout(() => {
        if (!isCurrentBuffer(host, buffer, generation)) return;
        buffer.remove();
        root.removeAttribute(categoryRouteBufferAttribute);
        clearAttemptMarkers(attemptId);
      }, cleanupDelay);
    });
  });
}

export function navigateWithCategoryContinuity(navigate: () => void) {
  const root = document.documentElement;
  const slug = root.getAttribute(categoryRouteEntryAttribute) ?? "unknown";
  const attemptId = createAttemptId();
  // A completed or interrupted older attempt must never style this one.
  root.removeAttribute(categoryRouteNativeTransitionAttribute);
  root.setAttribute(categoryRouteAttemptAttribute, attemptId);
  let navigated = false;
  const navigateOnce = () => {
    if (navigated) return;
    navigated = true;
    navigate();
  };

  const viewDocument = document as CategoryViewTransitionDocument;
  const startViewTransition = viewDocument.startViewTransition?.bind(viewDocument);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (startViewTransition && !reducedMotion) {
    const latch = createReadyLatch({ attemptId, slug });
    root.setAttribute(categoryRouteNativeTransitionAttribute, attemptId);
    void latch.promise.then(() => {
      if (!latch.wasMounted() && root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
        // If routing itself times out, expose the purposeful Next.js loading
        // layer before the UA captures a replacement frame.
        root.removeAttribute(categoryRouteNativeTransitionAttribute);
      }
    });
    try {
      const transition = startViewTransition(async () => {
        navigateOnce();
        // Keep the browser-owned old-page snapshot visible until the complete
        // layered category artwork has decoded and survived its settle frames.
        await latch.promise;
      });
      if (!transition?.finished || typeof transition.finished.then !== "function") throw new Error("invalid view transition");
      void transition.ready?.catch(() => {
        // A skipped/rejected native transition must not keep suppressing the
        // target readiness loader or force undecoded artwork visible.
        latch.settle();
        if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
          root.removeAttribute(categoryRouteNativeTransitionAttribute);
        }
      });
      const finalize = () => {
        latch.settle();
        clearAttemptMarkers(attemptId);
      };
      void transition.finished.then(finalize, finalize);
      return;
    } catch {
      latch.settle();
      if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) root.removeAttribute(categoryRouteNativeTransitionAttribute);
      // A non-conforming implementation may throw after invoking the update.
      // Never navigate twice or attempt to clone an already unmounted homepage.
      if (navigated) {
        clearAttemptMarkers(attemptId);
        return;
      }
    }
  }

  prepareCategoryRouteContinuity(attemptId);
  const latch = createReadyLatch({ attemptId, slug });
  void latch.promise.then(() => releaseCategoryRouteBuffer(attemptId, !latch.wasMounted()));
  navigateOnce();
}

export function announceCategoryRouteReady(detail: CategoryRouteReadyDetail) {
  window.dispatchEvent(new CustomEvent<CategoryRouteReadyDetail>(categoryRouteReadyEvent, { detail }));
}

export function announceCategoryRouteMounted(detail: Pick<CategoryRouteReadyDetail, "attemptId" | "slug">) {
  window.dispatchEvent(new CustomEvent(categoryRouteMountedEvent, { detail }));
}
