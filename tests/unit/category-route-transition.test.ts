import {
  announceCategoryRouteReady,
  announceCategoryRouteMounted,
  categoryRouteAttemptAttribute,
  categoryRouteBufferAttribute,
  categoryRouteBufferHostId,
  categoryRouteBufferReleaseDurationMs,
  categoryRouteCommitTimeoutMs,
  categoryRouteEntryAttribute,
  categoryRouteLoadingFeedbackAttribute,
  categoryRouteLoadingFeedbackDelayMs,
  categoryRouteNativeTransitionAttribute,
  categoryRouteReadyEvent,
  categoryRouteReadyTimeoutMs,
  navigateWithCategoryContinuity,
  prepareCategoryRouteContinuity,
} from "@/components/h5/category-route-transition";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

function deferred<T>() {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function installManualAnimationFrames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const flushFrame = (time = 0) => {
    const callback = callbacks.shift();
    expect(callback, "expected a queued animation frame").toBeDefined();
    callback?.(time);
  };
  return { callbacks, flushFrame };
}

function mountArchiveSource() {
  document.body.innerHTML = `
    <div id="${categoryRouteBufferHostId}" aria-hidden="true"></div>
    <main class="h5-shell reports-archive reports-archive-final is-leaving" data-archive-artwork-ready="true" data-pressed-slug="review-assurance">
      <div class="reports-archive-canvas">
        <div class="reports-archive-art" data-artwork-source="layered-originals">
          <img class="reports-archive-source-layer" data-source-part="archive-paper-texture" src="/paper.webp" alt="">
          <img class="reports-archive-source-layer archive-module-exit-layer" data-source-part="module-2-review-folder" data-archive-module="review-assurance" src="/review.webp" alt="">
        </div>
        <div class="archive-section-title-group archive-module-exit-layer" data-title-group="review-assurance">
          <img class="archive-section-title-poster" src="/review-title.webp" alt="">
        </div>
        <div class="archive-unlock-tab-motion" data-unlock-state="idle" data-unlock-progress="0.000">
          <div class="archive-unlock-tab-clip"><img class="archive-unlock-tab-image" src="/ribbon.webp" alt=""></div>
        </div>
        <nav class="reports-archive-hotspots"><button class="archive-category-hotspot" data-slug="review-assurance">复核保障</button></nav>
      </div>
    </main>`;
  return document.querySelector<HTMLElement>(".reports-archive-final")!;
}

describe("category route transition continuity", () => {
  const originalStartViewTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");

  it("does not add a controller-side delay before accepting the shared loading page", () => {
    expect(categoryRouteLoadingFeedbackDelayMs).toBe(0);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.removeAttribute(categoryRouteBufferAttribute);
    document.documentElement.removeAttribute(categoryRouteNativeTransitionAttribute);
    document.documentElement.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    document.documentElement.removeAttribute(categoryRouteAttemptAttribute);
    document.documentElement.removeAttribute(categoryRouteEntryAttribute);
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
    mountArchiveSource();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute(categoryRouteBufferAttribute);
    document.documentElement.removeAttribute(categoryRouteNativeTransitionAttribute);
    document.documentElement.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    document.documentElement.removeAttribute(categoryRouteAttemptAttribute);
    document.documentElement.removeAttribute(categoryRouteEntryAttribute);
    document.body.innerHTML = "";
    if (originalStartViewTransition) Object.defineProperty(document, "startViewTransition", originalStartViewTransition);
    else Reflect.deleteProperty(document, "startViewTransition");
  });

  it("keeps a frozen archive clone painted until the fallback destination is ready, then releases it after two frames", async () => {
    const { callbacks, flushFrame } = installManualAnimationFrames();
    const source = document.querySelector<HTMLElement>(".reports-archive-final")!;
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    const navigate = vi.fn();

    navigateWithCategoryContinuity(navigate);

    const host = document.getElementById(categoryRouteBufferHostId)!;
    const buffer = host.querySelector<HTMLElement>(":scope > .h5-category-route-buffer");
    const frozenArchive = buffer?.querySelector<HTMLElement>(".reports-archive-final");
    expect(buffer).not.toBeNull();
    expect(frozenArchive).not.toBeNull();
    expect(frozenArchive).not.toBe(source);
    expect(frozenArchive).toHaveAttribute("data-pressed-slug", "review-assurance");
    expect(frozenArchive).toHaveAttribute("data-archive-artwork-ready", "true");
    expect(frozenArchive?.style.getPropertyValue("animation")).toBe("none");
    expect(frozenArchive?.style.getPropertyPriority("animation")).toBe("important");
    const frozenArtwork = frozenArchive?.querySelector<HTMLElement>(".reports-archive-art");
    expect(frozenArtwork?.style.getPropertyValue("animation")).toBe("none");
    expect(frozenArtwork?.style.getPropertyPriority("animation")).toBe("important");
    expect(frozenArchive?.querySelector('[data-source-part="archive-paper-texture"]')).toBeInTheDocument();
    expect(frozenArchive?.querySelector('[data-source-part="module-2-review-folder"][data-archive-module="review-assurance"]')).toBeInTheDocument();
    expect(frozenArchive?.querySelector('[data-title-group="review-assurance"] .archive-section-title-poster')).toBeInTheDocument();
    expect(frozenArchive?.querySelector('.archive-unlock-tab-motion[data-unlock-state="idle"] .archive-unlock-tab-image')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(categoryRouteBufferAttribute, "active");

    // Settle the buffer's own preparing frames before beginning navigation.
    flushFrame();
    flushFrame();
    expect(buffer).toHaveClass("is-moving");

    expect(navigate).toHaveBeenCalledOnce();
    expect(buffer).not.toHaveClass("is-releasing");
    expect(callbacks).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(buffer).not.toHaveClass("is-releasing");
    expect(host).toContainElement(buffer);

    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    window.dispatchEvent(new CustomEvent(categoryRouteReadyEvent, { detail: { attemptId: "stale-attempt", slug: "review-assurance", status: "ready" } }));
    expect(callbacks).toHaveLength(0);
    announceCategoryRouteMounted({ attemptId, slug: "review-assurance" });
    announceCategoryRouteReady({ attemptId, slug: "review-assurance", status: "ready" });
    await Promise.resolve();
    expect(buffer).not.toHaveClass("is-releasing");
    expect(callbacks).toHaveLength(1);
    flushFrame();
    expect(buffer).not.toHaveClass("is-releasing");
    flushFrame();
    expect(buffer).toHaveClass("is-releasing");

    await vi.advanceTimersByTimeAsync(categoryRouteBufferReleaseDurationMs + 119);
    expect(host).toContainElement(buffer);
    expect(document.documentElement).toHaveAttribute(categoryRouteBufferAttribute, "active");
    await vi.advanceTimersByTimeAsync(1);
    expect(host).toBeEmptyDOMElement();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteBufferAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteAttemptAttribute);
  });

  it("keeps the native view-transition update pending for category ready and clears its root marker only after finished", async () => {
    const finished = deferred<void>();
    let updatePromise: Promise<void> | undefined;
    const startViewTransition = vi.fn((update: () => void | Promise<void>) => {
      updatePromise = Promise.resolve(update());
      return { finished: finished.promise };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: startViewTransition });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    const navigate = vi.fn();
    let updateSettled = false;
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");

    navigateWithCategoryContinuity(navigate);
    updatePromise?.then(() => { updateSettled = true; });
    await Promise.resolve();
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(updateSettled).toBe(false);
    expect(document.documentElement).toHaveAttribute(categoryRouteNativeTransitionAttribute, document.documentElement.getAttribute(categoryRouteAttemptAttribute)!);
    expect(document.getElementById(categoryRouteBufferHostId)).toBeEmptyDOMElement();
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;

    window.dispatchEvent(new Event("h5-category-route-mounted"));
    await Promise.resolve();
    await Promise.resolve();
    expect(updateSettled, "mount alone must not expose an undecoded category frame").toBe(false);

    announceCategoryRouteReady({ attemptId: "stale-attempt", slug: "inspection-projects", status: "ready" });
    await Promise.resolve();
    expect(updateSettled, "a stale ready event must not release the current transition").toBe(false);

    announceCategoryRouteMounted({ attemptId, slug: "inspection-projects" });
    announceCategoryRouteReady({ attemptId, slug: "inspection-projects", status: "ready" });
    await updatePromise;
    expect(updateSettled).toBe(true);
    expect(document.documentElement).toHaveAttribute(categoryRouteNativeTransitionAttribute, attemptId);

    finished.resolve();
    await finished.promise;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteAttemptAttribute);
  });

  it("hands a slow native route to the painted system loading page instead of freezing the archive", async () => {
    const { flushFrame } = installManualAnimationFrames();
    const finished = deferred<void>();
    let updatePromise: Promise<void> | undefined;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((update: () => void | Promise<void>) => {
        updatePromise = Promise.resolve(update());
        return { finished: finished.promise };
      }),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");

    navigateWithCategoryContinuity(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    const layer = document.createElement("div");
    layer.className = "runtime-loading-layer is-loading";
    const poster = document.createElement("img");
    poster.className = "guide-loading-buffer-poster";
    Object.defineProperty(poster, "complete", { configurable: true, value: true });
    Object.defineProperty(poster, "naturalWidth", { configurable: true, value: 750 });
    Object.defineProperty(poster, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    layer.append(poster);
    document.body.append(layer);

    // Flush observer/decode microtasks without advancing through a positive delay.
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
    flushFrame();
    flushFrame();
    await updatePromise;
    expect(document.documentElement).toHaveAttribute(categoryRouteNativeTransitionAttribute, attemptId);

    finished.resolve();
    await finished.promise;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteLoadingFeedbackAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteAttemptAttribute);
  });

  it("removes the fallback clone behind a painted loading page when the target becomes ready", async () => {
    const { flushFrame } = installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    navigateWithCategoryContinuity(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    flushFrame();
    flushFrame();

    const layer = document.createElement("div");
    layer.className = "runtime-loading-layer is-loading";
    const poster = document.createElement("img");
    poster.className = "guide-loading-buffer-poster";
    Object.defineProperty(poster, "complete", { configurable: true, value: true });
    Object.defineProperty(poster, "naturalWidth", { configurable: true, value: 750 });
    Object.defineProperty(poster, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    layer.append(poster);
    document.body.append(layer);

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    flushFrame();
    flushFrame();
    await Promise.resolve();
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);

    announceCategoryRouteMounted({ attemptId, slug: "review-assurance" });
    announceCategoryRouteReady({ attemptId, slug: "review-assurance", status: "ready" });
    await Promise.resolve();
    expect(document.getElementById(categoryRouteBufferHostId)).toBeEmptyDOMElement();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteBufferAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteLoadingFeedbackAttribute);
    expect(layer).toBeInTheDocument();
  });

  it("keeps a committed loading handoff when readiness lands between its paint frames", async () => {
    const { flushFrame } = installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    navigateWithCategoryContinuity(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    flushFrame();
    flushFrame();

    const layer = document.createElement("div");
    layer.className = "runtime-loading-layer is-loading";
    const poster = document.createElement("img");
    poster.className = "guide-loading-buffer-poster";
    Object.defineProperty(poster, "complete", { configurable: true, value: true });
    Object.defineProperty(poster, "naturalWidth", { configurable: true, value: 750 });
    Object.defineProperty(poster, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    layer.append(poster);
    document.body.append(layer);

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
    announceCategoryRouteMounted({ attemptId, slug: "review-assurance" });
    announceCategoryRouteReady({ attemptId, slug: "review-assurance", status: "ready" });
    await Promise.resolve();
    expect(document.querySelector(".h5-category-route-buffer")).toBeInTheDocument();

    flushFrame();
    await Promise.resolve();
    expect(document.querySelector(".h5-category-route-buffer")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);

    flushFrame();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById(categoryRouteBufferHostId)).toBeEmptyDOMElement();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteLoadingFeedbackAttribute);
  });

  it("cancels stale buffer frames and lets only the newest preparation own cleanup", async () => {
    const { flushFrame } = installManualAnimationFrames();
    expect(prepareCategoryRouteContinuity("attempt-one")).toBe(true);
    const host = document.getElementById(categoryRouteBufferHostId)!;
    const firstBuffer = host.firstElementChild;
    expect(prepareCategoryRouteContinuity("attempt-two")).toBe(true);
    const secondBuffer = host.firstElementChild;
    expect(secondBuffer).not.toBe(firstBuffer);
    flushFrame();
    flushFrame();
    flushFrame();
    expect(secondBuffer).toHaveClass("is-moving");
    expect(document.documentElement).toHaveAttribute(categoryRouteAttemptAttribute, "attempt-two");
  });

  it("releases the fallback after the bounded readiness timeout", async () => {
    const { flushFrame } = installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "production-traceability");
    navigateWithCategoryContinuity(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    flushFrame();
    flushFrame();
    announceCategoryRouteMounted({ attemptId, slug: "production-traceability" });
    await vi.advanceTimersByTimeAsync(categoryRouteReadyTimeoutMs);
    flushFrame();
    flushFrame();
    expect(document.querySelector(".h5-category-route-buffer")).toHaveClass("is-releasing");
  });

  it("keeps the source buffer through a slow route commit before starting the target readiness timeout", async () => {
    const { flushFrame } = installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");
    navigateWithCategoryContinuity(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    flushFrame();
    flushFrame();

    await vi.advanceTimersByTimeAsync(categoryRouteCommitTimeoutMs - 1);
    expect(document.querySelector(".h5-category-route-buffer")).not.toHaveClass("is-releasing");
    announceCategoryRouteMounted({ attemptId, slug: "inspection-projects" });
    await vi.advanceTimersByTimeAsync(categoryRouteReadyTimeoutMs - 1);
    expect(document.querySelector(".h5-category-route-buffer")).not.toHaveClass("is-releasing");
    await vi.advanceTimersByTimeAsync(1);
    flushFrame();
    flushFrame();
    expect(document.querySelector(".h5-category-route-buffer")).toHaveClass("is-releasing");
  });

  it("reveals the purposeful loading layer under the buffer when route commit itself times out", async () => {
    const { flushFrame } = installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    navigateWithCategoryContinuity(vi.fn());
    flushFrame();
    flushFrame();

    await vi.advanceTimersByTimeAsync(categoryRouteCommitTimeoutMs);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteBufferAttribute);
    flushFrame();
    flushFrame();
    expect(document.querySelector(".h5-category-route-buffer")).toHaveClass("is-releasing");
  });

  it("does not let an older native completion clear a newer fallback attempt", async () => {
    const nativeFinished = deferred<void>();
    let updatePromise: Promise<void> | undefined;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((update: () => void | Promise<void>) => {
        updatePromise = Promise.resolve(update());
        return { finished: nativeFinished.promise };
      }),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");
    navigateWithCategoryContinuity(vi.fn());
    const firstAttempt = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    expect(document.documentElement).toHaveAttribute(categoryRouteNativeTransitionAttribute, firstAttempt);

    Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    navigateWithCategoryContinuity(vi.fn());
    const secondAttempt = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    expect(secondAttempt).not.toBe(firstAttempt);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
    expect(document.querySelector(".h5-category-route-buffer")).toHaveAttribute("data-route-attempt", secondAttempt);

    await updatePromise;
    nativeFinished.resolve();
    await nativeFinished.promise;
    await Promise.resolve();
    expect(document.documentElement).toHaveAttribute(categoryRouteAttemptAttribute, secondAttempt);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
  });

  it("stops suppressing the readiness loader when the browser rejects a native transition", async () => {
    const ready = deferred<void>();
    const finished = deferred<void>();
    let updatePromise: Promise<void> | undefined;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((update: () => void | Promise<void>) => {
        updatePromise = Promise.resolve(update());
        return { ready: ready.promise, finished: finished.promise };
      }),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");
    navigateWithCategoryContinuity(vi.fn());
    expect(document.documentElement).toHaveAttribute(categoryRouteNativeTransitionAttribute);

    ready.resolve(Promise.reject(new Error("view transition skipped")));
    await ready.promise.catch(() => undefined);
    await Promise.resolve();
    await updatePromise;
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);

    finished.resolve();
    await finished.promise;
  });

  it("removes fallback overlays and attempt markers on pagehide for BFCache restores", async () => {
    installManualAnimationFrames();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "review-assurance");
    navigateWithCategoryContinuity(vi.fn());
    expect(document.querySelector(".h5-category-route-buffer")).toBeInTheDocument();
    window.dispatchEvent(new Event("pagehide"));
    await Promise.resolve();
    expect(document.getElementById(categoryRouteBufferHostId)).toBeEmptyDOMElement();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteBufferAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteAttemptAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
  });
});
