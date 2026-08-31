import {
  clearGuideRouteContinuity,
  guideRouteBufferHostId,
  guideRouteDestinationSrc,
  guideRouteEntryAttribute,
  guideRouteSnapshotSrc,
  prepareGuideRouteContinuity,
  primeGuideRouteContinuity,
} from "@/components/h5/guide-route-transition";

describe("guide route transition priming", () => {
  const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
  const originalNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
  const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
  let landscape = false;
  let decodedSources: string[] = [];

  beforeEach(() => {
    landscape = false;
    decodedSources = [];
    document.documentElement.removeAttribute(guideRouteEntryAttribute);
    document.documentElement.removeAttribute("style");
    document.body.innerHTML = `<div id="${guideRouteBufferHostId}"></div><main class="brand-guide"><section class="brand-guide-stage"></section></main>`;
    const guide = document.querySelector<HTMLElement>(".brand-guide")!;
    guide.getBoundingClientRect = () => ({
      bottom: 812,
      height: 812,
      left: 0,
      right: 375,
      top: 0,
      width: 375,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === "(orientation: landscape)" ? landscape : false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
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
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(performance.now());
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    clearGuideRouteContinuity();
    vi.unstubAllGlobals();
    if (originalComplete) Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
    if (originalNaturalWidth) Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", originalNaturalWidth);
    if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
    else delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
    document.body.innerHTML = "";
  });

  it("primes only the portrait foreground and lightweight destination, then reuses that buffer on commit", async () => {
    await expect(primeGuideRouteContinuity("portrait", false)).resolves.toBe(true);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const primedBuffer = host.firstElementChild as HTMLElement;
    const images = [...primedBuffer.querySelectorAll("img")];

    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      guideRouteSnapshotSrc,
      guideRouteDestinationSrc,
    ]);
    expect(primedBuffer).toHaveClass("is-preparing");
    expect(primedBuffer.dataset.guideOrientation).toBe("portrait");
    expect(primedBuffer.querySelector(".guide-landscape-composition")).toBeNull();
    expect(decodedSources).toEqual([guideRouteSnapshotSrc, guideRouteDestinationSrc]);

    await expect(prepareGuideRouteContinuity(.25, false)).resolves.toBe(true);
    expect(host.firstElementChild).toBe(primedBuffer);
    expect(host.childElementCount).toBe(1);
    expect(primedBuffer).not.toHaveClass("is-preparing");
    expect(primedBuffer).toHaveClass("is-committing");
    expect(decodedSources).toHaveLength(2);
    expect(document.documentElement).toHaveAttribute(guideRouteEntryAttribute, "active");
  });

  it("primes a landscape clone with the same transparent semantic character stack as the live guide", async () => {
    landscape = true;
    await expect(primeGuideRouteContinuity("landscape", false)).resolves.toBe(true);
    const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`)!;
    const character = buffer.querySelector<HTMLElement>(".guide-landscape-character")!;
    const characterSources = [...character.querySelectorAll("img")].map((image) => image.getAttribute("src"));

    expect(buffer.dataset.guideOrientation).toBe("landscape");
    expect(buffer.querySelector(".h5-guide-route-portrait-snapshot")).toBeNull();
    expect(characterSources).toEqual([
      "/design/guide/guide-arch.webp",
      "/design/guide/guide-character-open.webp",
      "/design/guide/guide-foreground-top.webp",
    ]);
    expect(buffer.querySelector(".guide-landscape-logo")).not.toBeNull();
    expect(buffer.querySelector(".guide-landscape-envelope")).not.toBeNull();
    expect(buffer.querySelector(".guide-landscape-hint")).not.toBeNull();
    expect([...buffer.querySelectorAll("img")]).toHaveLength(7);
    expect(decodedSources).not.toContain("/design/guide/guide-final-fallback-v3.webp");
  });

  it("replaces a stale orientation buffer instead of retaining two transition trees", async () => {
    await primeGuideRouteContinuity("portrait", false);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const portraitBuffer = host.firstElementChild as HTMLElement;

    await primeGuideRouteContinuity("landscape", false);
    expect(portraitBuffer.isConnected).toBe(false);
    expect(host.childElementCount).toBe(1);
    expect((host.firstElementChild as HTMLElement).dataset.guideOrientation).toBe("landscape");
  });

  it("does not wait for the destination preview when destination fallback is active", async () => {
    await expect(primeGuideRouteContinuity("portrait", true)).resolves.toBe(true);
    const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`)!;

    expect(buffer).toHaveClass("has-destination-fallback");
    expect(buffer.querySelector(".h5-guide-route-destination-image")).toHaveAttribute("src", guideRouteDestinationSrc);
    expect(decodedSources).toEqual([guideRouteSnapshotSrc]);
  });

  it("clear removes the hidden buffer and resets the prime cache", async () => {
    await primeGuideRouteContinuity("portrait", false);
    const host = document.getElementById(guideRouteBufferHostId)!;
    const first = host.firstElementChild;
    clearGuideRouteContinuity();

    expect(host).toBeEmptyDOMElement();
    await primeGuideRouteContinuity("portrait", false);
    expect(host.firstElementChild).not.toBe(first);
    expect(decodedSources).toHaveLength(4);
  });
});
