import {
  announceGuideRouteReady,
  clearGuideRouteContinuity,
  guideRouteBufferHostId,
  guideRouteEntryAttribute,
  guideRouteSnapshotSrc,
  guideRouteStageDurationMs,
  navigateWithGuideContinuity,
  prepareGuideRouteContinuity,
  primeGuideRouteContinuity,
} from "@/components/h5/guide-route-transition";

describe("guide route transition priming", () => {
  const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
  const originalNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
  const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
  let decodedSources: string[] = [];

  beforeEach(() => {
    decodedSources = [];
    document.documentElement.removeAttribute(guideRouteEntryAttribute);
    document.documentElement.removeAttribute("style");
    document.body.innerHTML = `<div id="${guideRouteBufferHostId}"></div><main class="brand-guide" data-guide-profile="portrait-standard"><div class="brand-guide-swipe-track"><section class="brand-guide-stage"></section></div></main>`;
    const rect = { bottom: 812, height: 812, left: 0, right: 375, top: 0, width: 375, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    document.querySelector<HTMLElement>(".brand-guide")!.getBoundingClientRect = () => rect;
    document.querySelector<HTMLElement>(".brand-guide-swipe-track")!.getBoundingClientRect = () => rect;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(), addListener: vi.fn(), dispatchEvent: vi.fn(), matches: query.includes("orientation: landscape") ? false : false,
        media: query, onchange: null, removeEventListener: vi.fn(), removeListener: vi.fn(),
      })),
    });
    Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 750 });
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn(function decode(this: HTMLImageElement) {
        decodedSources.push(this.getAttribute("src") ?? "");
        return Promise.resolve();
      }),
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(performance.now()); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    clearGuideRouteContinuity();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalComplete) Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
    if (originalNaturalWidth) Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", originalNaturalWidth);
    if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
    else delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
    document.body.innerHTML = "";
  });

  it("primes decoded portrait assets, keeps the buffer hidden, and reuses it on commit", async () => {
    await expect(primeGuideRouteContinuity("portrait-standard", false)).resolves.toBe(true);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const primed = host.firstElementChild as HTMLElement;
    const destinationBook = primed.querySelector<HTMLElement>('[data-guide-destination-group="archive-book"]');
    const destinationBatch = primed.querySelector<HTMLElement>('[data-guide-destination-group="latest-batch"]');
    expect(destinationBook).not.toBeNull();
    expect(destinationBatch).not.toBeNull();
    expect([...destinationBook!.querySelectorAll<HTMLElement>("[data-source-part]")].map((layer) => layer.dataset.sourcePart)).toEqual([
      "module-1-folder-back",
      "module-1-folder-front",
      "module-1-logo",
      "module-1-title",
      "module-1-badge",
    ]);
    expect([...destinationBatch!.querySelectorAll<HTMLElement>("[data-source-part]")].map((layer) => layer.dataset.sourcePart)).toEqual([
      "module-1-batch-coil",
      "module-1-batch",
      "module-1-passed-panel",
      "module-1-passed-copy",
    ]);
    const ribbon = destinationBook!.querySelector<HTMLElement>(".h5-guide-archive-entry-ribbon-clip");
    expect(ribbon).not.toBeNull();
    expect(ribbon).toHaveAttribute("data-guide-destination-ribbon", "idle");
    expect(ribbon).toHaveAttribute("data-unlock-progress", "0.000");
    expect(ribbon!.querySelectorAll(".h5-guide-archive-entry-ribbon")).toHaveLength(1);
    const imageSources = [...primed.querySelectorAll("img")].map((image) => image.getAttribute("src") ?? "");
    expect(imageSources[0]).toBe(guideRouteSnapshotSrc);
    expect(imageSources).not.toContain("/design/guide/archive-transition-preview.webp");
    expect(primed).toHaveClass("is-preparing");
    expect(primed.dataset.guideProfile).toBe("portrait-standard");
    expect(decodedSources).toEqual(imageSources);
    expect(document.documentElement).not.toHaveAttribute(guideRouteEntryAttribute);

    await expect(prepareGuideRouteContinuity(.25, false)).resolves.toBe(true);
    expect(host.firstElementChild).toBe(primed);
    expect(host.childElementCount).toBe(1);
    expect(primed).not.toHaveClass("is-preparing");
    expect(primed).toHaveClass("is-committing");
    expect(decodedSources).toHaveLength(imageSources.length);
    expect(document.documentElement).toHaveAttribute(guideRouteEntryAttribute, "active");
  });

  it("primes compact and landscape buffers from semantic responsive layers", async () => {
    await expect(primeGuideRouteContinuity("portrait-compact", false)).resolves.toBe(true);
    let buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`)!;
    expect(buffer.dataset.guideProfile).toBe("portrait-compact");
    expect(buffer.dataset.guideOrientation).toBe("portrait");
    expect(buffer.querySelector(".guide-compact-portrait-composition")).toBeNull();
    expect(buffer.querySelector(".h5-guide-route-snapshot")?.classList.contains("is-compact")).toBe(false);
    expect(buffer.querySelector(".h5-guide-route-snapshot")).toHaveClass("is-portrait");
    expect(buffer.querySelector(".h5-guide-route-portrait-snapshot")).toHaveAttribute("src", guideRouteSnapshotSrc);

    await expect(primeGuideRouteContinuity("landscape", false)).resolves.toBe(true);
    buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`)!;
    expect(buffer.dataset.guideProfile).toBe("landscape");
    expect(buffer.dataset.guideOrientation).toBe("landscape");
    expect(buffer.querySelector(".h5-guide-route-snapshot")).toHaveClass("is-landscape");
    expect(buffer.querySelector(".h5-guide-route-portrait-snapshot")).toBeNull();
    expect([...buffer.querySelectorAll(".guide-landscape-character img")].map((image) => image.getAttribute("src"))).toEqual([
      "/design/guide/guide-arch.webp",
      "/design/guide/guide-character-open.webp",
      "/design/guide/guide-foreground-top.webp",
    ]);
    expect(buffer.querySelector(".guide-landscape-logo")).not.toBeNull();
    expect(buffer.querySelector(".guide-landscape-envelope")).not.toBeNull();
    expect(buffer.querySelector(".guide-landscape-hint")).not.toBeNull();
  });

  it("replaces stale profiles and keeps explicit destination fallback decoded safely", async () => {
    await primeGuideRouteContinuity("portrait-standard", false);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const first = host.firstElementChild;
    await primeGuideRouteContinuity("portrait-compact", true);
    const buffer = host.firstElementChild as HTMLElement;
    expect(first?.isConnected).toBe(false);
    expect(host.childElementCount).toBe(1);
    expect(buffer).toHaveClass("has-destination-fallback");
    expect(buffer.querySelector('[data-guide-destination-group="archive-book"]')).not.toBeNull();
    expect(buffer.querySelector('[data-guide-destination-group="latest-batch"]')).not.toBeNull();
  });

  it("does not expose a partial buffer or route lock after required decoding fails", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn(function decode(this: HTMLImageElement) {
        return this.closest('[data-guide-destination-group="latest-batch"]') ? Promise.reject(new Error("decode failed")) : Promise.resolve();
      }),
    });
    await expect(primeGuideRouteContinuity("portrait-standard", false)).resolves.toBe(false);
    expect(document.getElementById(guideRouteBufferHostId)).toBeEmptyDOMElement();
    expect(document.documentElement).not.toHaveAttribute(guideRouteEntryAttribute);
  });

  it("defers an early route-ready reveal until the decoded commit window completes", async () => {
    vi.useFakeTimers();
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { rafCallbacks.push(callback); return rafCallbacks.length; }));
    await expect(primeGuideRouteContinuity("portrait-standard", false)).resolves.toBe(true);
    const preparation = prepareGuideRouteContinuity(.25, false);
    await Promise.resolve();
    rafCallbacks.shift()?.(0);
    await Promise.resolve();
    rafCallbacks.shift()?.(0);
    await expect(preparation).resolves.toBe(true);

    const buffer = document.querySelector<HTMLElement>(".h5-guide-route-buffer")!;
    expect(buffer).toHaveClass("is-committing");
    const navigate = vi.fn();
    navigateWithGuideContinuity(navigate);
    announceGuideRouteReady();
    expect(navigate).toHaveBeenCalledOnce();
    expect(buffer).not.toHaveClass("is-releasing");

    expect(buffer).not.toHaveClass("is-releasing");
    await vi.advanceTimersByTimeAsync(guideRouteStageDurationMs);
    rafCallbacks.shift()?.(guideRouteStageDurationMs);
    expect(buffer).toHaveClass("is-releasing");
  });

  it("keeps the prepared handoff hidden for one layout frame and ignores a stale release frame after clear", async () => {
    vi.useFakeTimers();
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { rafCallbacks.push(callback); return rafCallbacks.length; }));
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    await expect(primeGuideRouteContinuity("portrait-standard", false)).resolves.toBe(true);

    const preparation = prepareGuideRouteContinuity(.5, false);
    await Promise.resolve();
    await Promise.resolve();
    const buffer = document.querySelector<HTMLElement>(".h5-guide-route-buffer")!;
    expect(buffer).toHaveClass("is-preparing");
    expect(buffer).toHaveAttribute("data-commit-state", "prepared");
    expect(document.documentElement).not.toHaveAttribute(guideRouteEntryAttribute);

    rafCallbacks.shift()?.(1_000);
    await Promise.resolve();
    expect(buffer).not.toHaveClass("is-preparing");
    expect(buffer).not.toHaveClass("is-committing");
    expect(document.documentElement).toHaveAttribute(guideRouteEntryAttribute, "active");

    rafCallbacks.shift()?.(1_000);
    await expect(preparation).resolves.toBe(true);
    expect(buffer).toHaveClass("is-committing");

    const complete = vi.fn();
    window.addEventListener("h5-guide-route-complete", complete);
    navigateWithGuideContinuity(vi.fn());
    now.mockReturnValue(10_000);
    announceGuideRouteReady();
    expect(rafCallbacks).toHaveLength(1);

    clearGuideRouteContinuity();
    rafCallbacks.shift()?.(10_000);
    await vi.runAllTimersAsync();
    expect(document.documentElement).not.toHaveAttribute(guideRouteEntryAttribute);
    expect(document.getElementById(guideRouteBufferHostId)).toBeEmptyDOMElement();
    expect(complete).toHaveBeenCalledOnce();
    window.removeEventListener("h5-guide-route-complete", complete);
  });

  it("clear removes the hidden buffer and resets the prime cache", async () => {
    await primeGuideRouteContinuity("portrait-standard", false);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const first = host.firstElementChild;
    const firstPrimeDecodeCount = decodedSources.length;
    expect(firstPrimeDecodeCount).toBeGreaterThan(2);
    clearGuideRouteContinuity();
    expect(host).toBeEmptyDOMElement();
    await primeGuideRouteContinuity("portrait-standard", false);
    expect(host.firstElementChild).not.toBe(first);
    expect(decodedSources).toHaveLength(firstPrimeDecodeCount * 2);
  });
});
