import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { GuideExperience } from "@/components/h5/GuideExperience";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { ArchiveArtwork } from "@/components/h5/ArchiveArtwork";
import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { archiveModuleExitDelayMs } from "@/components/h5/category-route-transition";
import { clearGuideRouteContinuity, guideRouteAssetTimeoutMs, guideRouteBufferHostId, guideRouteDestinationSrc, guideRouteEntryAttribute, guideRouteNavigationDelayMs, primeGuideRouteContinuity, type GuideRouteProfile } from "@/components/h5/guide-route-transition";
import { h5MotionTiming } from "@/components/h5/motion/motion-config";
import { ArchiveFishFloatMotion } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { ArchiveSectionTitleMotion, archiveTitleBounceDurationMs } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { ArchiveStoryCopyMotion } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { RuntimeLoadingBuffer } from "@/components/h5/RuntimeLoadingBuffer";
import { adaptiveFailOpenDelayMs } from "@/components/h5/AdaptiveReadinessGate";
import { preloadHomepageAssets, releaseHomepagePreloadedAssets } from "@/components/h5/homepage-preload";

type PendingImage = { src: string; kind: "dom" | "preload"; settled: boolean; resolve: () => void; reject: () => void };
let pendingImages: PendingImage[] = [];
let loadedDomImages = new WeakSet<HTMLImageElement>();
const originalImageDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
const originalImageNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");

class PreloadImageMock {
  decoding = "auto";
  fetchPriority = "auto";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";

  decode() {
    return new Promise<void>((resolve, reject) => {
      pendingImages.push({
        src: this.src,
        kind: "preload",
        settled: false,
        resolve: () => { this.onload?.(); resolve(); },
        reject: () => { this.onerror?.(); reject(); },
      });
    });
  }
}

function imageSource(image: HTMLImageElement) {
  return image.getAttribute("src") ?? image.src;
}

function startDomImageDecodes(predicate: (image: PendingImage) => boolean) {
  for (const image of [...document.querySelectorAll<HTMLImageElement>("img")]) {
    if (loadedDomImages.has(image)) continue;
    const candidate = { src: imageSource(image), kind: "dom" as const, settled: false, resolve: () => undefined, reject: () => undefined };
    if (!predicate(candidate)) continue;
    loadedDomImages.add(image);
    fireEvent.load(image);
  }
}

function failDomImage(image: Element) {
  loadedDomImages.add(image as HTMLImageElement);
  fireEvent.error(image);
}

async function resolvePendingImages(predicate: (image: PendingImage) => boolean) {
  for (let round = 0; round < 80; round += 1) {
    startDomImageDecodes(predicate);
    await Promise.resolve();
    const batch = pendingImages.filter((image) => predicate(image) && !image.settled);
    batch.forEach((image) => {
      image.settled = true;
      image.resolve();
    });
    await Promise.resolve();
    if (batch.length === 0) await Promise.resolve();
  }
}

async function resolveAllPendingImages(predicate: (image: PendingImage) => boolean = () => true) {
  // React may enqueue follow-up decode work after the selected responsive
  // composition commits, so settle it across separate React turns.
  for (let round = 0; round < 4; round += 1) {
    await act(async () => { await resolvePendingImages(predicate); });
  }
}

const isGuideReadinessAsset = ({ src }: PendingImage) => src.includes("/design/guide/");

function signalVisibleGuideDestinationDecoded(container: HTMLElement) {
  const destination = container.querySelector<HTMLImageElement>(".brand-guide-destination-image");
  if (!destination) throw new Error("Guide destination preview was not mounted");
  fireEvent.load(destination);
}

async function settleGuideRenderEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
  });
}

async function decodeMountedGuideImages() {
  await settleGuideRenderEffects();
  await act(async () => { await resolvePendingImages(() => true); });
  // Fake timers replace the synchronous RAF stub. Advance both readiness
  // frames, then let the destination-ready render mount its primed buffer.
  if (vi.isFakeTimers()) {
    await act(async () => { await vi.advanceTimersByTimeAsync(32); });
  }
  await act(async () => { await resolvePendingImages(() => true); });
  const profile = document.querySelector<HTMLElement>(".brand-guide")?.dataset.guideProfile as GuideRouteProfile | "unknown" | undefined;
  if (profile && profile !== "unknown") {
    await act(async () => {
      await primeGuideRouteContinuity(profile, false);
      await Promise.resolve();
    });
  }
  await settleGuideRenderEffects();
}

async function unlockGuideGesture() {
  await decodeMountedGuideImages();
  await act(async () => { await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.crossfadeMs); });
  await act(async () => { await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.swipeReadyMs + 32); });
}

describe("multi-page H5 interactions", () => {
  beforeEach(() => {
    releaseHomepagePreloadedAssets();
    pendingImages = [];
    loadedDomImages = new WeakSet<HTMLImageElement>();
    sessionStorage.clear();
    document.getElementById(guideRouteBufferHostId)?.remove();
    document.documentElement.removeAttribute("data-category-route-entry");
    document.documentElement.removeAttribute(guideRouteEntryAttribute);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 812 });
    vi.stubGlobal("Image", PreloadImageMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 750 });
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: function decode(this: HTMLImageElement) {
        return new Promise<void>((resolve, reject) => {
          const pending: PendingImage = {
            src: imageSource(this),
            kind: "dom",
            settled: false,
            resolve,
            reject,
          };
          pendingImages.push(pending);
        });
      },
    });
    document.body.insertAdjacentHTML("afterbegin", `<div id="${guideRouteBufferHostId}" aria-hidden="true"></div>`);
    vi.stubGlobal("IntersectionObserver", class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "0px";
      thresholds = [.25];
    });
  });

  afterEach(() => {
    clearGuideRouteContinuity();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalImageDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalImageDecode);
    else delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
    if (originalImageNaturalWidth) Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", originalImageNaturalWidth);
    if (originalInnerWidth) Object.defineProperty(window, "innerWidth", originalInnerWidth);
    if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight);
  });

  it("maps the three archive folders to their matching category routes", () => {
    const modules = [
      { id: "trace", slug: "production-traceability", title: "生产溯源", description: null, cards: [] },
      { id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] },
      { id: "review", slug: "review-assurance", title: "复核保障", description: null, cards: [] },
    ];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const links = [...container.querySelectorAll<HTMLButtonElement>(".archive-category-hotspot")];
    expect(links.map((link) => link.dataset.slug)).toEqual(["inspection-projects", "review-assurance", "production-traceability"]);
    expect(links.map((link) => link.style.top)).toEqual(["49.406154%", "56.253374%", "62.668706%"]);
    expect(links.map((link) => link.style.height)).toEqual(["6.84722%", "6.415332%", "16.051827%"]);
    expect(links.map((link) => link.style.left)).toEqual(["0%", "0%", "0%"]);
    expect(links.map((link) => link.style.width)).toEqual(["100%", "100%", "100%"]);
    expect(links.every((link) => link.style.transform === "")).toBe(true);
  });

  it("fails the archive loading gate open while preserving the whole-page fallback", async () => {
    vi.useFakeTimers();
    const { container } = render(<ReportsArchive modules={[]}/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(adaptiveFailOpenDelayMs); });

    const archive = container.querySelector(".reports-archive-final");
    expect(archive).toHaveAttribute("data-archive-artwork-ready", "false");
    expect(archive).toHaveAttribute("data-archive-artwork-failed", "true");
    expect(container.querySelector(".reports-archive-reference-fallback")).toHaveAttribute("data-fallback-image", "mounted");
    expect(screen.getByRole("alert")).toHaveTextContent("部分档案素材加载失败");
    expect(container.querySelector(".runtime-loading-layer")).not.toBeInTheDocument();
  });

  it("shows immediate feedback before buffering the matching category route", () => {
    vi.useFakeTimers();
    const modules = [{ id: "review", slug: "review-assurance", title: "复核保障", description: null, cards: [] }];
    const { container } = render(<ReportsArchive modules={modules}/>);

    const hotspot = container.querySelector<HTMLButtonElement>('[data-slug="review-assurance"]')!;
    const archive = container.querySelector(".reports-archive");
    fireEvent.pointerDown(hotspot);

    expect(archive).toHaveAttribute("data-pressed-slug", "review-assurance");
    expect(hotspot).toHaveClass("is-pressed");

    fireEvent.click(hotspot);

    expect(document.documentElement).toHaveAttribute("data-category-route-entry", "review-assurance");
    expect(archive).not.toHaveClass("is-leaving");
    act(() => vi.advanceTimersByTime(archiveModuleExitDelayMs));
    expect(archive).toHaveClass("is-leaving");
    expect(archive).toHaveAttribute("data-exit-slug", "review-assurance");
  });

  it("does not drop a category click while the completed guide reveal marker awaits cleanup", () => {
    vi.useFakeTimers();
    const modules = [{ id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] }];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const hotspot = container.querySelector<HTMLButtonElement>('[data-mascot-slug="inspection-projects"]')!;
    const archive = container.querySelector(".reports-archive");
    document.documentElement.setAttribute(guideRouteEntryAttribute, "revealing");

    fireEvent.click(hotspot);

    expect(document.documentElement).not.toHaveAttribute(guideRouteEntryAttribute);
    expect(document.documentElement).toHaveAttribute("data-category-route-entry", "inspection-projects");
    act(() => vi.advanceTimersByTime(archiveModuleExitDelayMs));
    expect(archive).toHaveClass("is-leaving");
  });

  it("maps the supplied click cue to inspection and covers the complete brown board", () => {
    const modules = [
      { id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] },
      { id: "production", slug: "production-traceability", title: "生产溯源", description: null, cards: [] },
    ];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const cue = screen.getByRole("button", { name: "点击进入检测项目" });
    const production = container.querySelector<HTMLButtonElement>('[data-slug="production-traceability"]')!;
    expect(cue).toHaveAttribute("data-cue-slug", "inspection-projects");
    expect(cue).toHaveStyle({ left: "53.3%", top: "45.80691%", width: "42%", height: "3.707036%" });
    expect(production).toHaveStyle({ top: "62.668706%", height: "16.051827%" });
  });

  it("keeps the inspection mascot mapped to green while preserving the yellow folder boundary", () => {
    vi.useFakeTimers();
    const modules = [
      { id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] },
      { id: "review", slug: "review-assurance", title: "复核保障", description: null, cards: [] },
    ];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const mascot = screen.getByRole("button", { name: "检测项目人物，点击进入检测项目" });
    const review = container.querySelector<HTMLButtonElement>('[data-slug="review-assurance"]')!;

    expect(mascot).toHaveAttribute("data-mascot-slug", "inspection-projects");
    expect(mascot).toHaveClass("archive-inspection-mascot-hotspot");
    expect(mascot).toHaveStyle({ left: "41%", top: "52.843261%", width: "27%", height: "5.758503%" });
    expect(review).toHaveStyle({ top: "56.253374%" });
    fireEvent.pointerDown(mascot);
    expect(container.querySelector(".reports-archive")).toHaveAttribute("data-pressed-slug", "inspection-projects");
    expect(mascot).toHaveClass("is-pressed");
    fireEvent.click(mascot);
    expect(document.documentElement).toHaveAttribute("data-category-route-entry", "inspection-projects");
  });

  it("assembles the archive from original layers and preserves navigation hotspots", () => {
    const modules = [{ id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] }];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const artwork = container.querySelector<HTMLElement>("[data-artwork-source='layered-originals']");
    expect(container.querySelector(".reports-archive-canvas")).toContainElement(artwork);
    expect(artwork).toHaveClass("reports-archive-art", "reports-archive-source-art");
    expect(container.querySelector('[src*="archive-reference-public.webp"]')).toHaveClass("reports-archive-reference-fallback-image");
    expect(container.querySelector(".reports-archive-reference-fallback")).toHaveAttribute("data-fallback-image", "mounted");
    expect(container.querySelectorAll(".reports-archive-source-layer").length).toBeGreaterThan(0);
    const entryGroups = [...container.querySelectorAll<HTMLElement>("[data-guide-entry-group]")];
    expect(entryGroups.map((group) => group.dataset.guideEntryGroup)).toEqual(["archive-book", "latest-batch"]);
    const bookGroup = entryGroups[0]!;
    const batchGroup = entryGroups[1]!;
    expect(bookGroup).toContainElement(container.querySelector(".archive-unlock-tab-motion"));
    expect([...bookGroup.querySelectorAll<HTMLElement>("[data-source-part]")].map((layer) => layer.dataset.sourcePart)).toEqual([
      "module-1-folder-back",
      "module-1-folder-front",
      "module-1-logo",
      "module-1-title",
      "module-1-badge",
    ]);
    expect([...batchGroup.querySelectorAll<HTMLElement>("[data-source-part]")].map((layer) => layer.dataset.sourcePart)).toEqual([
      "module-1-batch-coil",
      "module-1-batch",
      "module-1-passed-panel",
    ]);
    expect(container.querySelector(".archive-module-one")).not.toBeInTheDocument();
    expect(container.querySelector('[data-slug="inspection-projects"]')).toBeInTheDocument();
  });

  it("does not render the retired module-two decoration or static title resources", () => {
    const { container } = render(<ArchiveArtwork/>);
    const sourceParts = [...container.querySelectorAll<HTMLElement>("[data-source-part]")]
      .map((layer) => layer.dataset.sourcePart);
    expect(sourceParts).toEqual(expect.arrayContaining(["module-2-resource-10", "module-2-resource-20"]));
    expect(sourceParts).not.toContain("module-1-swipe");
    for (const resource of ["04", "05", "06", "07"]) {
      expect(sourceParts).not.toContain(`module-2-resource-${resource}`);
    }
    for (let resource = 11; resource <= 19; resource += 1) {
      expect(sourceParts).not.toContain(`module-2-resource-${resource}`);
    }
  });

  it("does not render independently scaled archive animation canvases", () => {
    const { container } = render(<ReportsArchive modules={[]}/>);
    expect(container.querySelector(".archive-module-circle")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-module-result-passed")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-module-unlock")).not.toBeInTheDocument();
  });

  it("does not duplicate baked final-state copy with extra motion layers", () => {
    const { container } = render(<ReportsArchive modules={[]}/>);
    expect(container.querySelectorAll(".archive-motion")).toHaveLength(0);
    expect(container.querySelector(".archive-motion-layers")).not.toBeInTheDocument();
  });

  it("wires the supplied fish GIFs, story reveal, and three CSS title groups over the archive artwork", () => {
    const { container } = render(<>
      <ArchiveArtwork/>
      <ArchiveStoryCopyMotion/>
      <ArchiveFishFloatMotion/>
      <ArchiveSectionTitleMotion/>
    </>);
    expect(container.querySelector("[data-motion-module='archiveStoryCopy']")).toBeInTheDocument();
    expect(container.querySelectorAll(".archive-story-copy-line")).toHaveLength(4);
    expect(container.querySelector("[data-motion-module='archiveFishFloat']")).toBeInTheDocument();
    expect(container.querySelector("[data-motion-module='archiveSectionTitle']")).toBeInTheDocument();
    expect(container.querySelector(".archive-section-click-cue")).toBeInTheDocument();
    expect([...container.querySelectorAll<HTMLElement>(".archive-section-title-group")].map((group) => group.dataset.titleGroup)).toEqual([
      "inspection-projects",
      "review-assurance",
      "production-traceability",
    ]);
    expect(container.querySelector(".archive-section-title-gif")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".archive-section-title-poster")).toHaveLength(3);
    expect(container.querySelectorAll(".archive-section-number-part")).toHaveLength(6);
    expect(container.querySelector(".archive-unlock-tab-motion")).toBeInTheDocument();
    expect(container.querySelector(".archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "idle");
  });

  it("advances the tight unlock ribbon from trusted scroll without per-frame image duplication", () => {
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    let scrollY = 0;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    try {
      const { container } = render(<ArchiveUnlockTabMotion />);
      const ribbon = container.querySelector(".archive-unlock-tab-motion");

      fireEvent.wheel(window);
      scrollY = 60;
      fireEvent.scroll(window);
      expect(ribbon).toHaveAttribute("data-unlock-state", "revealing");
      expect(ribbon).toHaveAttribute("data-unlock-progress", "0.333");
      expect(container.querySelectorAll(".archive-unlock-tab-image")).toHaveLength(1);
      expect(container.querySelector(".motion-stage")).not.toBeInTheDocument();

      scrollY = 180;
      fireEvent.scroll(window);
      expect(ribbon).toHaveAttribute("data-unlock-state", "revealed");
      expect(ribbon).toHaveAttribute("data-unlock-progress", "1.000");
    } finally {
      if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    }
  });

  it("runs the archive title posters on a stable compositor-backed 1-2-3 loop", async () => {
    vi.stubGlobal("IntersectionObserver", class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
      observe(target: Element) {
        this.callback([{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "0px";
      thresholds = [0, .05];
    });
    const { container } = render(<ArchiveSectionTitleMotion />);
    await act(async () => { await Promise.resolve(); });

    const sequence = container.querySelector("[data-motion-module='archiveSectionTitle']");
    expect(archiveTitleBounceDurationMs).toBe(1217);
    expect(sequence).toHaveAttribute("data-title-sequence-running", "true");
    expect(sequence).toHaveAttribute("data-title-sequence-mode", "css-compositor-loop");
    expect([...container.querySelectorAll("[data-title-sequence-order]")].map((group) => group.getAttribute("data-title-sequence-order"))).toEqual(["1", "2", "3"]);
    expect(container.querySelectorAll(".archive-section-title-poster")).toHaveLength(3);
    expect(container.querySelector(".archive-section-title-gif")).not.toBeInTheDocument();
  });

  it("keeps the approved archive artwork stable for reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { container } = render(<>
      <ArchiveArtwork/>
      <ArchiveStoryCopyMotion/>
      <ArchiveFishFloatMotion/>
      <ArchiveSectionTitleMotion/>
    </>);
    expect(container.querySelector(".archive-fish-float")).toBeInTheDocument();
    expect(container.querySelector(".archive-fish-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-fish-motion-gif")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".archive-section-title-group")).toHaveLength(3);
    expect(container.querySelector(".archive-section-title-gif")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-section-title-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".archive-section-title-poster")).toHaveLength(3);
    expect(container.querySelectorAll(".archive-section-number-part")).toHaveLength(6);
    expect(container.querySelector(".archive-story-copy-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-result-color")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "fallback");
  });

  it("stays on the guide after five seconds and only enters once from the hint action", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<BrandGuide onEnter={onEnter} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(onEnter).not.toHaveBeenCalled();
    await unlockGuideGesture();
    const action = screen.getByRole("button", { name: "进入档案" });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    fireEvent.click(action);
    await act(async () => { await vi.advanceTimersByTimeAsync(guideRouteAssetTimeoutMs + guideRouteNavigationDelayMs + 32); });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("renders the guide directly and primes only lightweight guide-route artwork", async () => {
    const { container } = render(<GuideExperience />);

    expect(container.querySelector(".guide-loading-buffer")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide")).toBeInTheDocument();
    await act(async () => {
      await resolvePendingImages(isGuideReadinessAsset);
    });
    expect(pendingImages.every(isGuideReadinessAsset)).toBe(true);
    expect(pendingImages.some(({ src }) => src.includes("archive-paper-texture.webp"))).toBe(false);
    expect(pendingImages.some(({ src }) => src.includes("section-title-inspection-poster.webp"))).toBe(false);
    expect(container.querySelector(".brand-guide-destination-image")).toHaveAttribute("src", guideRouteDestinationSrc);
    expect(document.querySelector(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`)).toHaveAttribute("data-guide-profile", "portrait-standard");
  });

  it("limits competing image warmups and never mounts the retired loading GIF", async () => {
    vi.useFakeTimers();
    const warmup = preloadHomepageAssets(Array.from({ length: 7 }, (_, index) => ({ src: `/warm-${index}.webp`, priority: "high" as const })));
    expect(pendingImages).toHaveLength(4);
    await act(async () => {
      await resolvePendingImages(({ src }) => src.startsWith("/warm-"));
    });
    await expect(warmup).resolves.toEqual({ total: 7, failed: [] });

    const { container } = render(<RuntimeLoadingBuffer />);
    expect(container.querySelector(".guide-loading-buffer-poster")).toBeInTheDocument();
    expect(container.querySelector(".guide-loading-buffer-gif")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(container.querySelector(".guide-loading-buffer-gif")).not.toBeInTheDocument();
  });

  it("keeps the lightweight loading poster for reduced-motion users", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { container } = render(<RuntimeLoadingBuffer />);
    expect(container.querySelector(".guide-loading-buffer-poster")).toBeInTheDocument();
    expect(container.querySelector(".guide-loading-buffer-gif")).not.toBeInTheDocument();
  });

  it("keeps the static fallback until every actual standard DOM layer has decoded", async () => {
    const { container } = render(<BrandGuide />);
    const page = container.querySelector(".brand-guide")!;
    const finalPaper = "/design/guide/report-paper-bottom.webp";

    expect(page).toHaveClass("is-loading");
    expect(container.querySelector(".brand-guide-fallback")).toHaveAttribute("src", "/design/guide/guide-static-foreground.webp");
    await act(async () => {
      await resolvePendingImages(({ src }) => src.includes("/design/guide/") && !src.includes(finalPaper));
    });
    expect(page).toHaveClass("is-loading");

    await act(async () => {
      await resolvePendingImages(() => true);
    });
    expect(page).toHaveClass("is-ready");
    expect(container.querySelector(".brand-guide-live-stage")).toBeInTheDocument();
    expect(container.querySelector(".motion-stage")).not.toBeInTheDocument();
  });

  it("mounts only the selected compact or landscape composition", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 568 });
    const compact = render(<BrandGuide />);
    await waitFor(() => expect(compact.container.querySelector(".brand-guide")).toHaveAttribute("data-guide-profile", "portrait-compact"));
    expect(compact.container.querySelector(".guide-compact-portrait-composition")).toBeInTheDocument();
    expect(compact.container.querySelectorAll(".guide-compact-paper")).toHaveLength(4);
    expect(compact.container.querySelectorAll(".guide-compact-character-layer")).toHaveLength(4);
    expect(compact.container.querySelector(".brand-guide-live-stage")).not.toBeInTheDocument();
    expect(compact.container.querySelector(".guide-landscape-composition")).not.toBeInTheDocument();
    compact.unmount();
    clearGuideRouteContinuity();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 667 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 375 });
    const landscape = render(<BrandGuide />);
    await waitFor(() => expect(landscape.container.querySelector(".brand-guide")).toHaveAttribute("data-guide-profile", "landscape"));
    expect(landscape.container.querySelector(".guide-landscape-composition")).toBeInTheDocument();
    expect(landscape.container.querySelectorAll(".guide-landscape-character img")).toHaveLength(3);
    expect(landscape.container.querySelector(".brand-guide-portrait-scene")).not.toBeInTheDocument();
    expect(landscape.container.querySelector(".guide-compact-portrait-composition")).not.toBeInTheDocument();
  });

  it("tracks touch progress after actual DOM decode and the fallback crossfade", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    const stage = container.querySelector(".brand-guide-stage");
    await decodeMountedGuideImages();
    expect(page).toHaveClass("is-ready", "is-motion-enabled");
    expect(stage).toHaveAttribute("data-swipe-state", "locked");
    expect(stage).toHaveAttribute("data-gesture-state", "locked");
    expect(stage).toHaveAttribute("data-swipe-distance-px", "24");
    expect(screen.getByRole("button", { name: "进入档案" })).toBeDisabled();
    await act(async () => signalVisibleGuideDestinationDecoded(container));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.crossfadeMs - 1);
    });
    expect(stage).toHaveAttribute("data-gesture-state", "locked");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(stage).toHaveAttribute("data-gesture-state", "locked");
    await act(async () => { await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.swipeReadyMs - 1); });
    expect(stage).toHaveAttribute("data-gesture-state", "locked");
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(stage).toHaveAttribute("data-gesture-state", "ready");
    fireEvent.touchStart(page, { touches: [{ identifier: 1, clientX: 200, clientY: 300 }] });
    await act(async () => {
      fireEvent.touchMove(page, { touches: [{ identifier: 1, clientX: 198, clientY: 276 }] });
      await vi.advanceTimersByTimeAsync(16);
    });
    expect(page).toHaveClass("is-dragging");
    expect(Number(page.getAttribute("data-swipe-progress"))).toBeGreaterThan(0);
    expect(page).not.toHaveClass("is-leaving");
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 1, clientX: 196, clientY: 220 }] });
    expect(page).toHaveClass("is-leaving");
    await act(async () => { await vi.advanceTimersByTimeAsync(guideRouteAssetTimeoutMs + guideRouteNavigationDelayMs + 1); });
    expect(onEnter).toHaveBeenCalledOnce();
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 1, clientX: 196, clientY: 180 }] });
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it.each([
    ["downward", { x: 200, y: 220 }, { x: 196, y: 300 }],
    ["rightward", { x: 180, y: 260 }, { x: 250, y: 255 }],
    ["leftward", { x: 260, y: 300 }, { x: 190, y: 310 }],
    ["short upward", { x: 200, y: 260 }, { x: 198, y: 237 }],
    ["mostly horizontal diagonal", { x: 260, y: 320 }, { x: 165, y: 255 }],
  ])("does not enter after a %s gesture", async (_label, start, end) => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    await unlockGuideGesture();
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-gesture-state", "ready");
    fireEvent.touchStart(page, { touches: [{ identifier: 1, clientX: start.x, clientY: start.y }] });
    fireEvent.touchMove(page, { touches: [{ identifier: 1, clientX: end.x, clientY: end.y }] });
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 1, clientX: end.x, clientY: end.y }] });
    expect(page).toHaveAttribute("data-swipe-interaction", "settling");
    await act(async () => { await vi.advanceTimersByTimeAsync(320); });
    expect(page).toHaveAttribute("data-swipe-interaction", "idle");
    expect(page).toHaveAttribute("data-swipe-progress", "0.000");
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("does not finish the tracked touch when an unrelated finger ends", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    await unlockGuideGesture();
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-gesture-state", "ready");
    fireEvent.touchStart(page, { touches: [{ identifier: 1, clientX: 200, clientY: 320 }] });
    fireEvent.touchMove(page, { touches: [{ identifier: 1, clientX: 198, clientY: 210 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 2, clientX: 240, clientY: 260 }] });
    expect(page).toHaveClass("is-dragging");
    expect(onEnter).not.toHaveBeenCalled();
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 1, clientX: 198, clientY: 210 }] });
    expect(page).toHaveClass("is-leaving");
  });

  it("cancels a touch-only gesture when a second finger joins", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    await unlockGuideGesture();
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-gesture-state", "ready");
    fireEvent.touchStart(page, { touches: [{ identifier: 1, clientX: 200, clientY: 320 }] });
    fireEvent.touchMove(page, { touches: [{ identifier: 1, clientX: 198, clientY: 210 }] });
    expect(page).toHaveClass("is-dragging");
    fireEvent.touchStart(page, { touches: [
      { identifier: 1, clientX: 198, clientY: 210 },
      { identifier: 2, clientX: 240, clientY: 260 },
    ] });
    expect(page).not.toHaveClass("is-dragging");
    expect(page).toHaveAttribute("data-swipe-interaction", "settling");
    fireEvent.touchEnd(page, { changedTouches: [{ identifier: 1, clientX: 198, clientY: 180 }] });
    expect(page).not.toHaveClass("is-leaving");
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("cancels a primary pointer gesture when a second touch pointer joins", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    const dispatchTouchPointer = (type: string, values: Record<string, string | number | boolean>) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.entries(values).forEach(([name, value]) => Object.defineProperty(event, name, { value }));
      fireEvent(page, event);
    };
    await unlockGuideGesture();
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-gesture-state", "ready");
    dispatchTouchPointer("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: 200, clientY: 320 });
    dispatchTouchPointer("pointermove", { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 198, clientY: 210 });
    expect(page).toHaveClass("is-dragging");
    dispatchTouchPointer("pointerdown", { pointerId: 2, pointerType: "touch", isPrimary: false, button: 0, clientX: 240, clientY: 260 });
    expect(page).not.toHaveClass("is-dragging");
    expect(page).toHaveAttribute("data-swipe-interaction", "settling");
    dispatchTouchPointer("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 198, clientY: 180 });
    expect(page).not.toHaveClass("is-leaving");
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("offers a visible back control while retaining deliberate right-swipe navigation", () => {
    vi.useFakeTimers();
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><p>资料内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");
    expect(screen.getByRole("button", { name: "返回上一级" })).toBeInTheDocument();
    fireEvent.touchStart(page, { touches: [{ clientX: 30, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 80, clientY: 205 }] });
    expect(page).not.toHaveClass("is-swipe-back");
    fireEvent.touchStart(page, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 200, clientY: 206 }] });
    expect(page).not.toHaveClass("is-swipe-back");
    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    expect(page).toHaveClass("is-swipe-back");
  });

  it("can hide the back control without disabling deliberate right-swipe navigation", () => {
    vi.useFakeTimers();
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports" showBackControl={false}><p>资料内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");
    expect(screen.queryByRole("button", { name: "返回上一页" })).not.toBeInTheDocument();
    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    expect(page).toHaveClass("is-swipe-back");
  });

  it("does not treat a zoomed report pan as page-level swipe back", () => {
    vi.useFakeTimers();
    const asset = { id: "asset-1", title: "营养检测报告", description: null, type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const, pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }] };
    const { container } = render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports" showBackControl={false}><ImageReportViewer asset={asset} /></SwipeBackPage>);
    const page = screen.getByRole("main");
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(stage).toHaveAttribute("data-swipe-back-ignore", "true");
    fireEvent.touchStart(stage, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 120, clientY: 206 }] });
    fireEvent.touchEnd(stage, { touches: [], changedTouches: [{ clientX: 120, clientY: 206 }] });
    expect(page).not.toHaveClass("is-swipe-back");
  });

  it("does not treat a pan inside a swipe-back-ignored surface as page-level navigation", () => {
    vi.useFakeTimers();
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><div data-swipe-back-ignore>报告图片</div></SwipeBackPage>);
    const page = screen.getByRole("main");
    const viewer = screen.getByText("报告图片");
    fireEvent.touchStart(viewer, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 140, clientY: 204 }] });
    expect(page).not.toHaveClass("is-swipe-back");
  });

  it("cancels a pending page swipe when a second touch joins", () => {
    vi.useFakeTimers();
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports" showBackControl={false}><p>资料内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");
    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }, { clientX: 60, clientY: 200 }] });
    fireEvent.touchEnd(page, { touches: [{ clientX: 60, clientY: 200 }], changedTouches: [{ clientX: 120, clientY: 206 }] });
    expect(page).not.toHaveClass("is-swipe-back");
  });

  it("does not restore the cancelled fullscreen report interaction", () => {
    const asset = { id: "asset-1", title: "营养检测报告", description: null, type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const, pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }] };
    render(<ImageReportViewer asset={asset} />);
    expect(screen.queryByText("全屏")).not.toBeInTheDocument();
    return;
    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(screen.getByRole("img")).toHaveStyle({ transform: "scale(1.25)" });
    fireEvent.click(screen.getByRole("button", { name: "全屏" }));
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toHaveTextContent("加载失败");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows only the static guide fallback while its module is disabled", async () => {
    const { container } = render(<BrandGuide preview />);
    const page = screen.getByRole("main");
    const stage = container.querySelector(".brand-guide-stage");
    expect(page).toHaveClass("is-disabled", "is-motion-disabled");
    expect(stage).toHaveAttribute("data-load-state", "disabled");
    expect(stage).toHaveAttribute("data-animation-state", "disabled");
    expect(pendingImages).toHaveLength(0);
    expect(container.querySelector(".brand-guide-fallback")).toBeInTheDocument();
  });

  it("mounts guide animation layers with the configured unified timeline", async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    expect(page).toHaveAttribute("data-guide-profile", "portrait-standard");
    expect(container.querySelectorAll(".brand-guide-paper")).toHaveLength(4);
    expect(container.querySelector(".brand-guide-paper-arm-occlusion")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-paper-right-occlusion")).not.toBeInTheDocument();
    const animatedCanvas = container.querySelector(".is-animated-canvas");
    const windowFrame = animatedCanvas?.querySelector(".brand-guide-arch");
    expect(windowFrame).toBeInTheDocument();
    expect(animatedCanvas?.querySelector(".brand-guide-window-mask")).not.toBeInTheDocument();
    expect(animatedCanvas?.querySelector(".brand-guide-base")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-character-open")?.getAttribute("src")).toContain("guide-character-open.webp");
    expect(container.querySelector(".brand-guide-character-closed")?.getAttribute("src")).toContain("guide-character-closed.webp");
    const stage = container.querySelector(".brand-guide-stage");
    expect(stage).toHaveAttribute("data-blink-start-ms", "350");
    expect(stage).toHaveAttribute("data-blink-hold-ms", "200");
    expect(stage).toHaveAttribute("data-blink-duration-ms", "270");
    expect(stage).toHaveAttribute("data-paper-start-ms", "420");
    expect(stage).toHaveAttribute("data-paper-duration-ms", "1500");
    expect(stage).not.toHaveAttribute("data-hint-start-ms");
    expect(stage).not.toHaveAttribute("data-hint-duration-ms");
    expect(stage).toHaveAttribute("data-swipe-ready-ms", "2140");
    expect(h5MotionTiming.guide.crossfadeMs).toBe(180);
    expect(container.querySelector(".brand-guide-dynamic-stage")).toBeInTheDocument();
    expect(container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-fallback")?.getAttribute("src")).toContain("guide-static-foreground.webp");
    expect(page).toHaveClass("is-loading");
    await decodeMountedGuideImages();
    expect(page).toHaveClass("is-ready");
    expect(screen.getByRole("button", { name: "进入档案" })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.crossfadeMs); });
    await act(async () => { await vi.advanceTimersByTimeAsync(h5MotionTiming.guide.swipeReadyMs); });
    expect(screen.getByRole("button", { name: "进入档案" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "进入档案" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(guideRouteNavigationDelayMs); });
    expect(onEnter).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("keeps the static foreground fallback when a critical DOM layer fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(<BrandGuide/>);
    const character = container.querySelector(".is-animated-canvas .brand-guide-character-open");
    expect(character).toBeInTheDocument();
    failDomImage(character as Element);
    await waitFor(() => expect(container.querySelector(".brand-guide")).toHaveClass("is-failed"));
    expect(container.querySelector(".brand-guide-fallback")?.getAttribute("src")).toContain("guide-static-foreground.webp");
    expect(container.querySelector(".brand-guide")).not.toHaveClass("has-no-fallback");
    consoleError.mockRestore();
  });

  it("keeps the textured destination fallback after a separate preload later succeeds", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(<BrandGuide/>);
    const page = screen.getByRole("main");
    const stage = container.querySelector(".brand-guide-stage");
    const destination = container.querySelector(".brand-guide-destination-image");
    failDomImage(destination as Element);
    expect(stage).toHaveAttribute("data-destination-state", "fallback");
    expect(page).toHaveClass("has-destination-fallback");
    await resolveAllPendingImages();
    expect(stage).toHaveAttribute("data-destination-state", "fallback");
    expect(page).toHaveClass("has-destination-fallback");
    consoleError.mockRestore();
  });

  it("keeps the final static fallback when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { container } = render(<BrandGuide />);
    const page = screen.getByRole("main");
    await waitFor(() => expect(page).toHaveClass("is-reduced"));
    expect(pendingImages).toHaveLength(0);
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-load-state", "reduced");
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-animation-state", "paused");
    expect(container.querySelector(".brand-guide-dynamic-stage")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-fallback")).toHaveAttribute("src", "/design/guide/guide-static-foreground.webp");
    expect(container.querySelector(".brand-guide-destination-image")).toHaveAttribute("src", guideRouteDestinationSrc);
  });

  it("keeps the 750 by 1625 guide stage stable while disabled", async () => {
    const { container } = render(<BrandGuide preview />);
    const stage = container.querySelector(".brand-guide-stage");
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveAttribute("data-load-state", "disabled");
    expect(stage).toHaveClass("brand-guide-stage");
  });

  it("uses the shared H5 content frame for the guide and reports archive", () => {
    const guide = render(<BrandGuide preview />);
    expect(guide.container.querySelector(".brand-guide")).toBeInTheDocument();
    guide.unmount();
    const reports = render(<ReportsArchive modules={[]} preview />);
    expect(reports.container.querySelector(".reports-archive")).toHaveClass("h5-shell");
  });
});
