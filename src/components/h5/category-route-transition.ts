export const categoryRouteEntryAttribute = "data-category-route-entry";
export const categoryRouteAttemptAttribute = "data-category-route-attempt";
export const categoryRouteEntrySource = "reports-archive";
export const categoryRouteBufferedEntrySource = "reports-archive-buffer";
export const categoryRouteNativeEntrySource = "reports-archive-native";
export const categoryRouteLoadingEntrySource = "reports-archive-loading";
export const categoryRouteBufferAttribute = "data-category-route-buffer";
export const categoryRouteNativeTransitionAttribute = "data-category-native-transition";
export const categoryRouteLoadingFeedbackAttribute = "data-category-loading-feedback";
export const categoryRouteReadyEvent = "h5-category-route-ready";
export const categoryRouteMountedEvent = "h5-category-route-mounted";
export const categoryRouteBufferHostId = "h5-category-route-buffer-host";
export const categoryRouteLoadingHostId = "h5-category-route-loading-host";
// Keep one short, perceptible pressed frame for touch and keyboard activation
// before the compositor transition takes ownership of the route.
export const archiveModuleExitDelayMs = 16;
export const archiveModuleExitDurationMs = 420;
export const archiveModuleNavigationDelayMs = 0;
export const categoryRouteBufferReleaseDurationMs = 520;
export const categoryRouteReadyTimeoutMs = 3400;
export const categoryRouteCommitTimeoutMs = 30000;
// Begin observing the shared loading page as soon as navigation starts. The
// loading components keep their own short reveal threshold, so cached routes
// still hand off directly without stacking another controller-side delay.
export const categoryRouteLoadingFeedbackDelayMs = 0;

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

type LoadingFeedback = {
  attemptId: string;
  promise: Promise<void>;
  cancel: () => void;
  wasCommitted: () => boolean;
  wasPainted: () => boolean;
};

type LoadingFeedbackOptions = {
  immediate?: boolean;
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
let activeLoadingFeedback: LoadingFeedback | undefined;

function setPersistentLoadingAccessibility(visible: boolean) {
  document.getElementById(categoryRouteLoadingHostId)?.setAttribute("aria-hidden", visible ? "false" : "true");
}

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

function waitForLoadingImage(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve(image.naturalWidth > 0);
  return new Promise<boolean>((resolve) => {
    const finish = () => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve(image.naturalWidth > 0);
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
    if (image.complete) finish();
  });
}

function createLoadingFeedback(attemptId: string, { immediate = false }: LoadingFeedbackOptions = {}) {
  activeLoadingFeedback?.cancel();
  const root = document.documentElement;
  let cancelled = false;
  let committed = false;
  let painted = false;
  let resolvingLayer: HTMLElement | undefined;
  let revealTimer: number | undefined;
  let observer: MutationObserver | undefined;
  let paintFrames: number[] = [];
  let resolvePainted: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => { resolvePainted = resolve; });

  const cancelPaintFrames = () => {
    paintFrames.forEach((frame) => window.cancelAnimationFrame(frame));
    paintFrames = [];
  };
  const stopWatching = () => {
    window.clearTimeout(revealTimer);
    revealTimer = undefined;
    observer?.disconnect();
    observer = undefined;
  };
  const queuePaintFrame = (callback: () => void) => {
    const frame = window.requestAnimationFrame(() => {
      paintFrames = paintFrames.filter((queued) => queued !== frame);
      callback();
    });
    paintFrames.push(frame);
  };
  const ownsAttempt = () => !cancelled
    && root.getAttribute(categoryRouteAttemptAttribute) === attemptId;
  const finishPaint = () => {
    if (!ownsAttempt()) return;
    // Once visibility changes, this loading frame owns the handoff. A target
    // becoming ready during the following paint frames must not cancel it and
    // briefly expose the old clone again.
    if (!committed) {
      committed = true;
      root.setAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
      setPersistentLoadingAccessibility(true);
    }
    if (painted || paintFrames.length > 0) return;
    // Two compositor frames guarantee that the decoded system loading poster
    // is paintable before either a fallback overlay or native snapshot uses it.
    queuePaintFrame(() => queuePaintFrame(() => {
      if (!ownsAttempt()
        || root.getAttribute(categoryRouteLoadingFeedbackAttribute) !== attemptId) return;
      painted = true;
      stopWatching();
      resolvePainted?.();
    }));
  };
  const prepareLayer = (layer: HTMLElement) => {
    if (!ownsAttempt() || resolvingLayer === layer) return;
    const image = layer.querySelector<HTMLImageElement>(".guide-loading-buffer-poster");
    if (!image) return;
    resolvingLayer = layer;
    void waitForLoadingImage(image).then(async (loaded) => {
      if (!loaded || !ownsAttempt() || !layer.isConnected || layer.classList.contains("is-leaving")) {
        if (resolvingLayer === layer) resolvingLayer = undefined;
        return;
      }
      if (typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          if (resolvingLayer === layer) resolvingLayer = undefined;
          return;
        }
      }
      finishPaint();
    });
  };
  const findLoadingLayer = () => {
    const persistentLayer = document.querySelector<HTMLElement>(`#${categoryRouteLoadingHostId} .runtime-loading-layer:not(.is-leaving)`);
    const layer = persistentLayer ?? document.querySelector<HTMLElement>(".runtime-loading-layer:not(.is-leaving):not(.is-persistent)");
    if (layer) prepareLayer(layer);
  };

  const startWatching = () => {
    if (!ownsAttempt()) return;
    observer = new MutationObserver(findLoadingLayer);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    findLoadingLayer();
  };

  // Homepage category taps use the server-rendered persistent layer as a
  // deterministic handoff surface. Its solid fallback and poster already
  // exist in the reports layout, so visibility must never wait for image
  // load/decode. Decoding can continue independently behind the overlay.
  if (immediate) {
    finishPaint();
  } else if (categoryRouteLoadingFeedbackDelayMs > 0) {
    revealTimer = window.setTimeout(startWatching, categoryRouteLoadingFeedbackDelayMs);
  } else {
    startWatching();
  }

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    stopWatching();
    cancelPaintFrames();
    if (root.getAttribute(categoryRouteLoadingFeedbackAttribute) === attemptId) {
      root.removeAttribute(categoryRouteLoadingFeedbackAttribute);
      setPersistentLoadingAccessibility(false);
    }
    if (activeLoadingFeedback?.attemptId === attemptId) activeLoadingFeedback = undefined;
  };
  const feedback = {
    attemptId,
    promise,
    cancel,
    wasCommitted: () => committed,
    wasPainted: () => painted,
  };
  activeLoadingFeedback = feedback;
  return feedback;
}

/**
 * Gives category navigation a continuously painted loading handoff.
 *
 * The loading surface is made visible synchronously before the router starts.
 * This intentionally bypasses the legacy full-page clone and native View
 * Transition paths: both can block the first response frame on mobile WebKit.
 */
export function navigateWithCategoryLoadingHandoff(navigate: () => void) {
  const root = document.documentElement;
  const slug = root.getAttribute(categoryRouteEntryAttribute) ?? "unknown";
  const attemptId = createAttemptId();

  activeReadyLatch?.settle();
  activeLoadingFeedback?.cancel();
  clearBufferSchedules();
  bufferGeneration += 1;
  document.getElementById(categoryRouteBufferHostId)?.replaceChildren();
  root.removeAttribute(categoryRouteBufferAttribute);
  root.removeAttribute(categoryRouteNativeTransitionAttribute);
  root.removeAttribute(categoryRouteLoadingFeedbackAttribute);
  setPersistentLoadingAccessibility(false);
  root.setAttribute(categoryRouteAttemptAttribute, attemptId);

  const loadingFeedback = createLoadingFeedback(attemptId, { immediate: true });
  const latch = createReadyLatch({ attemptId, slug });

  try {
    navigate();
  } catch (error) {
    latch.settle();
    disposeCategoryRouteAttempt(attemptId);
    throw error;
  }

  void latch.promise.then(() => {
    // The target announces readiness only after its approved artwork settles.
    // Keep the loading layer above it for two more target paint frames so the
    // handoff cannot expose an intermediate or blank frame.
    if (loadingFeedback.wasPainted()) disposeCategoryRouteAttemptAfterPaint(attemptId);
    else void loadingFeedback.promise.then(() => disposeCategoryRouteAttemptAfterPaint(attemptId));
  });
}

function clearAttemptMarkers(attemptId: string) {
  const root = document.documentElement;
  if (root.getAttribute(categoryRouteAttemptAttribute) !== attemptId) return;
  if (activeLoadingFeedback?.attemptId === attemptId) activeLoadingFeedback.cancel();
  if (root.getAttribute(categoryRouteLoadingFeedbackAttribute) === attemptId) {
    root.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    setPersistentLoadingAccessibility(false);
  }
  root.removeAttribute(categoryRouteAttemptAttribute);
  root.removeAttribute(categoryRouteEntryAttribute);
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
  if (activeLoadingFeedback?.attemptId === attemptId) activeLoadingFeedback.cancel();
  clearBufferSchedules();
  bufferGeneration += 1;
  document.getElementById(categoryRouteBufferHostId)?.replaceChildren();
  root.removeAttribute(categoryRouteBufferAttribute);
  if (root.getAttribute(categoryRouteLoadingFeedbackAttribute) === attemptId) {
    root.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    setPersistentLoadingAccessibility(false);
  }
  root.removeAttribute(categoryRouteAttemptAttribute);
  root.removeAttribute(categoryRouteEntryAttribute);
  if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
    root.removeAttribute(categoryRouteNativeTransitionAttribute);
  }
}

function disposeCategoryRouteAttemptAfterPaint(attemptId: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => disposeCategoryRouteAttempt(attemptId));
  });
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
  clone.removeAttribute("data-pressed-slug");
  clone.querySelectorAll(".is-pressed, .archive-module-pressed-layer").forEach((node) => node.classList.remove("is-pressed", "archive-module-pressed-layer"));
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
  activeLoadingFeedback?.cancel();
  root.removeAttribute(categoryRouteNativeTransitionAttribute);
  root.setAttribute(categoryRouteAttemptAttribute, attemptId);
  let loadingFeedback = createLoadingFeedback(attemptId);
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
    const nativeLoadingFeedback = loadingFeedback;
    let handoffDestination: "ready" | "loading" | null = null;
    const handoffFrame = Promise.race([
      latch.promise.then(() => "ready" as const),
      nativeLoadingFeedback.promise.then(() => "loading" as const),
    ]).then(async (destination) => {
      if (destination === "ready" && nativeLoadingFeedback.wasCommitted()) {
        await nativeLoadingFeedback.promise;
        return "loading" as const;
      }
      return destination;
    });
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
        // Fast routes still hand directly to the complete target. On a slow
        // route, capture the already decoded and painted loading page instead
        // of leaving the pressed homepage snapshot apparently frozen.
        handoffDestination = await handoffFrame;
        if (handoffDestination === "ready") nativeLoadingFeedback.cancel();
      });
      if (!transition?.finished || typeof transition.finished.then !== "function") throw new Error("invalid view transition");
      void transition.ready?.catch(() => {
        // A skipped/rejected native transition must not keep suppressing the
        // target readiness loader. The persistent loading frame remains in
        // control until the target dispatches its painted readiness signal.
        if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
          root.removeAttribute(categoryRouteNativeTransitionAttribute);
        }
      });
      const finalize = () => {
        if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) {
          root.removeAttribute(categoryRouteNativeTransitionAttribute);
        }
        if (handoffDestination === "loading" || nativeLoadingFeedback.wasCommitted()) {
          void latch.promise.then(() => {
            if (nativeLoadingFeedback.wasPainted()) disposeCategoryRouteAttemptAfterPaint(attemptId);
            else void nativeLoadingFeedback.promise.then(() => disposeCategoryRouteAttemptAfterPaint(attemptId));
          });
          return;
        }
        latch.settle();
        clearAttemptMarkers(attemptId);
      };
      void transition.finished.then(finalize, finalize);
      return;
    } catch {
      if (root.getAttribute(categoryRouteNativeTransitionAttribute) === attemptId) root.removeAttribute(categoryRouteNativeTransitionAttribute);
      // A non-conforming implementation may throw after invoking the update.
      // Never navigate twice or attempt to clone an already unmounted homepage.
      if (navigated) {
        void latch.promise.then(() => {
          if (loadingFeedback.wasCommitted()) {
            if (loadingFeedback.wasPainted()) disposeCategoryRouteAttemptAfterPaint(attemptId);
            else void loadingFeedback.promise.then(() => disposeCategoryRouteAttemptAfterPaint(attemptId));
          } else {
            loadingFeedback.cancel();
            clearAttemptMarkers(attemptId);
          }
        });
        return;
      }
      latch.settle();
      loadingFeedback.cancel();
      loadingFeedback = createLoadingFeedback(attemptId);
    }
  }

  prepareCategoryRouteContinuity(attemptId);
  const latch = createReadyLatch({ attemptId, slug });
  void latch.promise.then(() => {
    if (loadingFeedback.wasCommitted()) {
      // The painted loading page already owns every visible pixel. Remove the
      // old-page clone behind it in one operation so it cannot reappear while
      // the target's readiness layer fades away.
      if (loadingFeedback.wasPainted()) disposeCategoryRouteAttemptAfterPaint(attemptId);
      else void loadingFeedback.promise.then(() => disposeCategoryRouteAttemptAfterPaint(attemptId));
      return;
    }
    loadingFeedback.cancel();
    releaseCategoryRouteBuffer(attemptId, !latch.wasMounted());
  });
  navigateOnce();
}

export function announceCategoryRouteReady(detail: CategoryRouteReadyDetail) {
  window.dispatchEvent(new CustomEvent<CategoryRouteReadyDetail>(categoryRouteReadyEvent, { detail }));
}

export function announceCategoryRouteMounted(detail: Pick<CategoryRouteReadyDetail, "attemptId" | "slug">) {
  window.dispatchEvent(new CustomEvent(categoryRouteMountedEvent, { detail }));
}
