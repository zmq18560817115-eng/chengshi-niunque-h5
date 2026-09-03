import {
  announceGuideRouteReady,
  clearGuideRouteContinuity,
  guideRouteBufferHostId,
  guideRouteCommitDurationMs,
  navigateWithGuideContinuity,
  prepareGuideRouteContinuity,
} from "@/components/h5/guide-route-transition";

type RafCallback = FrameRequestCallback;

function mountGuideShell() {
  const host = document.createElement("div");
  host.id = guideRouteBufferHostId;
  const source = document.createElement("main");
  source.className = "brand-guide";
  const track = document.createElement("div");
  track.className = "brand-guide-swipe-track";
  const stage = document.createElement("section");
  stage.className = "brand-guide-stage";
  track.append(stage);
  source.append(track);
  document.body.append(host, source);
  const viewportRect = {
    x: 0, y: 0, left: 0, top: 0, right: 375, bottom: 812,
    width: 375, height: 812, toJSON: () => undefined,
  } as DOMRect;
  Object.defineProperty(source, "getBoundingClientRect", { configurable: true, value: () => viewportRect });
  Object.defineProperty(track, "getBoundingClientRect", { configurable: true, value: () => viewportRect });
}

function captureCreatedImages() {
  const createdImages: HTMLImageElement[] = [];
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
    const element = createElement(tagName, options);
    if (tagName.toLowerCase() === "img") createdImages.push(element as HTMLImageElement);
    return element;
  }) as typeof document.createElement);
  return createdImages;
}

async function decodeImage(image: HTMLImageElement) {
  Object.defineProperty(image, "complete", { configurable: true, value: true });
  Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
  Object.defineProperty(image, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  image.dispatchEvent(new Event("load"));
  await Promise.resolve();
  await Promise.resolve();
}

describe("guide route decoded-image continuity", () => {
  let rafCallbacks: RafCallback[];

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
    document.documentElement.removeAttribute("data-guide-route-entry");
    mountGuideShell();
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: RafCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    clearGuideRouteContinuity();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("keeps the live guide until both route images decode and defers an early reveal", async () => {
    const createdImages = captureCreatedImages();
    const activation = prepareGuideRouteContinuity(.25);
    expect(createdImages).toHaveLength(2);
    expect(document.querySelector(".h5-guide-route-buffer")).not.toBeInTheDocument();

    await decodeImage(createdImages[0]!);
    expect(document.querySelector(".h5-guide-route-buffer")).not.toBeInTheDocument();
    await decodeImage(createdImages[1]!);
    await activation;

    const buffer = document.querySelector<HTMLElement>(".h5-guide-route-buffer")!;
    expect(buffer).toHaveAttribute("data-source-state", "decoded");
    expect(buffer).toHaveAttribute("data-destination-state", "decoded");
    expect(buffer).not.toHaveClass("is-committing");

    const navigate = vi.fn();
    navigateWithGuideContinuity(navigate);
    announceGuideRouteReady();
    expect(navigate).toHaveBeenCalledOnce();
    expect(buffer).toHaveAttribute("data-reveal-pending", "true");
    expect(buffer).not.toHaveClass("is-releasing");

    rafCallbacks.shift()?.(0);
    rafCallbacks.shift()?.(0);
    expect(buffer).toHaveClass("is-committing");
    expect(buffer).not.toHaveAttribute("data-reveal-pending");
    expect(buffer).not.toHaveClass("is-releasing");

    await vi.advanceTimersByTimeAsync(guideRouteCommitDurationMs);
    rafCallbacks.shift()?.(guideRouteCommitDurationMs);
    expect(buffer).toHaveClass("is-releasing");
  });

  it("commits an explicit error fallback when the route destination cannot decode", async () => {
    const createdImages = captureCreatedImages();
    const activation = prepareGuideRouteContinuity(.5);
    await decodeImage(createdImages[0]!);
    createdImages[1]!.dispatchEvent(new Event("error"));
    await activation;

    const buffer = document.querySelector<HTMLElement>(".h5-guide-route-buffer")!;
    expect(buffer).toHaveClass("has-destination-fallback");
    expect(buffer).toHaveAttribute("data-destination-state", "fallback");
    expect(buffer.querySelector(".h5-guide-route-snapshot")).toBeInTheDocument();
    expect(buffer).not.toHaveClass("is-committing");
    rafCallbacks.shift()?.(0);
    rafCallbacks.shift()?.(0);
    expect(buffer).toHaveClass("is-committing");
  });
});
