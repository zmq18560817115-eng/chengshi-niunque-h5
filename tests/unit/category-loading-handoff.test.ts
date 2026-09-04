import {
  announceCategoryRouteMounted,
  announceCategoryRouteReady,
  categoryRouteAttemptAttribute,
  categoryRouteBufferAttribute,
  categoryRouteBufferHostId,
  categoryRouteEntryAttribute,
  categoryRouteLoadingFeedbackAttribute,
  categoryRouteLoadingHostId,
  categoryRouteNativeTransitionAttribute,
  navigateWithCategoryLoadingHandoff,
} from "@/components/h5/category-route-transition";

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

function mountPersistentLoadingLayer(decode: () => Promise<void> = () => Promise.resolve()) {
  document.body.innerHTML = `
    <div id="${categoryRouteBufferHostId}" aria-hidden="true"></div>
    <div id="${categoryRouteLoadingHostId}" aria-hidden="true">
      <div class="runtime-loading-layer is-loading is-persistent">
        <img class="guide-loading-buffer-poster" src="/loading.webp" alt="">
      </div>
    </div>
    <main class="h5-shell reports-archive reports-archive-final">
      <div class="reports-archive-canvas">archive</div>
    </main>`;

  const poster = document.querySelector<HTMLImageElement>(".guide-loading-buffer-poster")!;
  Object.defineProperty(poster, "complete", { configurable: true, value: true });
  Object.defineProperty(poster, "naturalWidth", { configurable: true, value: 750 });
  Object.defineProperty(poster, "decode", { configurable: true, value: vi.fn(decode) });

  return {
    bufferHost: document.getElementById(categoryRouteBufferHostId)!,
    loadingHost: document.getElementById(categoryRouteLoadingHostId)!,
    poster,
  };
}

describe("homepage category loading handoff", () => {
  const originalStartViewTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");

  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.setAttribute(categoryRouteEntryAttribute, "inspection-projects");
    document.documentElement.removeAttribute(categoryRouteAttemptAttribute);
    document.documentElement.removeAttribute(categoryRouteBufferAttribute);
    document.documentElement.removeAttribute(categoryRouteNativeTransitionAttribute);
    document.documentElement.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
  });

  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute(categoryRouteEntryAttribute);
    document.documentElement.removeAttribute(categoryRouteAttemptAttribute);
    document.documentElement.removeAttribute(categoryRouteBufferAttribute);
    document.documentElement.removeAttribute(categoryRouteNativeTransitionAttribute);
    document.documentElement.removeAttribute(categoryRouteLoadingFeedbackAttribute);
    document.body.innerHTML = "";
    if (originalStartViewTransition) Object.defineProperty(document, "startViewTransition", originalStartViewTransition);
    else Reflect.deleteProperty(document, "startViewTransition");
  });

  it("hands control to the persistent loading page synchronously even when poster decoding never settles", () => {
    installManualAnimationFrames();
    const neverDecoded = new Promise<void>(() => undefined);
    const { loadingHost } = mountPersistentLoadingLayer(() => neverDecoded);
    const navigate = vi.fn();

    navigateWithCategoryLoadingHandoff(navigate);

    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;
    expect(attemptId).toMatch(/^category-/);
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
    expect(loadingHost).toHaveAttribute("aria-hidden", "false");
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("bypasses native view transitions and never creates an archive clone", () => {
    installManualAnimationFrames();
    const { bufferHost } = mountPersistentLoadingLayer();
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    navigateWithCategoryLoadingHandoff(vi.fn());

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(bufferHost).toBeEmptyDOMElement();
    expect(document.querySelector(".h5-category-route-buffer")).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteBufferAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteNativeTransitionAttribute);
  });

  it("keeps loading visible for a slow target and releases it only after two ready paint frames", async () => {
    const { callbacks, flushFrame } = installManualAnimationFrames();
    const { loadingHost } = mountPersistentLoadingLayer();

    navigateWithCategoryLoadingHandoff(vi.fn());
    const attemptId = document.documentElement.getAttribute(categoryRouteAttemptAttribute)!;

    // First paint the already mounted loading surface itself.
    flushFrame();
    flushFrame();
    await Promise.resolve();
    expect(callbacks).toHaveLength(0);

    announceCategoryRouteMounted({ attemptId, slug: "inspection-projects" });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
    expect(loadingHost).toHaveAttribute("aria-hidden", "false");
    expect(callbacks).toHaveLength(0);

    announceCategoryRouteReady({ attemptId, slug: "inspection-projects", status: "ready" });
    await Promise.resolve();
    expect(callbacks).toHaveLength(1);
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);

    flushFrame();
    expect(document.documentElement).toHaveAttribute(categoryRouteLoadingFeedbackAttribute, attemptId);
    expect(loadingHost).toHaveAttribute("aria-hidden", "false");

    flushFrame();
    expect(document.documentElement).not.toHaveAttribute(categoryRouteLoadingFeedbackAttribute);
    expect(document.documentElement).not.toHaveAttribute(categoryRouteAttemptAttribute);
    expect(loadingHost).toHaveAttribute("aria-hidden", "true");
  });
});
