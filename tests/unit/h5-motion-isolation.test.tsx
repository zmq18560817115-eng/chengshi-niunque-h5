import { act, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MotionBoundary } from "@/components/h5/motion/MotionBoundary";
import { MotionStage } from "@/components/h5/motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "@/components/h5/motion/motion-config";

function BrokenMotion(): never { throw new Error("motion failed"); }

describe("H5 motion isolation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("enables validated motion modules by default while preserving runtime switches", () => {
    expect(H5_MOTION_ENABLED).toBe(true);
    expect(h5MotionModules).toEqual({
      guide: true,
      archiveLatestCircle: true,
      archiveUnlockTab: true,
      archiveResultColor: true,
      archiveStoryCopy: true,
      archiveFishFloat: true,
      archiveSectionTitle: true,
      categoryEnter: true,
      reportImageLoad: true,
    });
    render(<MotionStage enabled={false} masterWidth={750} masterHeight={1625} fallback={<p>静态原图</p>}><p>动画层</p></MotionStage>);
    expect(screen.getByText("静态原图")).toBeInTheDocument();
    expect(screen.queryByText("动画层")).not.toBeInTheDocument();
  });

  it("contains an animation exception without removing the page fallback", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onError = vi.fn();
    render(<MotionBoundary fallback={<p>稳定页面</p>} onError={onError}><BrokenMotion/></MotionBoundary>);
    await waitFor(() => expect(screen.getByText("稳定页面")).toBeInTheDocument());
    expect(onError).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("does not create a dynamic stage when animation is disabled", () => {
    const { container } = render(<MotionStage enabled={false} masterWidth={750} masterHeight={1625} fallback={<div data-testid="fallback"/>}><div/></MotionStage>);
    expect(container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("keeps an asset timeout terminal when a late image eventually loads", async () => {
    vi.useFakeTimers();
    let finishImage: (() => void) | undefined;
    class SlowImage {
      decoding = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      decode() {
        return new Promise<void>((resolve) => {
          finishImage = () => { this.onload?.(); resolve(); };
        });
      }
    }
    const onStateChange = vi.fn();
    vi.stubGlobal("Image", SlowImage);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { container } = render(<MotionStage assets={["/slow.png"]} masterWidth={100} masterHeight={100} fallback={<p>静态回退</p>} onStateChange={onStateChange}><p>动画内容</p></MotionStage>);
    await act(async () => undefined);
    expect(container.querySelector(".motion-stage")).toHaveAttribute("data-motion-state", "loading");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("静态回退")).toBeInTheDocument();
    await act(async () => { finishImage?.(); await Promise.resolve(); });
    expect(screen.getByText("静态回退")).toBeInTheDocument();
    expect(onStateChange).not.toHaveBeenCalledWith("ready");
  });

  it("does not force the guide fallback visible after the dynamic stage is ready", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain(".motion-stage .brand-guide-fallback");
    expect(css).toContain(".motion-stage-fallback .brand-guide-fallback");
  });

  it("prefetches the archive and keeps guide navigation inside the Next client router", () => {
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(guide).toContain('router.prefetch("/reports")');
    expect(guide).toContain('router.push("/reports")');
    expect(guide).not.toContain('window.location.assign("/reports")');
  });

  it("covers the safe guide viewport with every full-canvas layer on the same undistorted canvas", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(css).toContain("overflow: hidden; align-items: center;");
    expect(css).toMatch(/\.brand-guide-stage\s*\{[^}]*width:\s*min\(100%,\s*var\(--h5-content-width\)\);[^}]*height:\s*100%;[^}]*aspect-ratio:\s*auto;[^}]*overflow:\s*hidden;/);
    expect(css).toMatch(/\.brand-guide-base,\s*\.brand-guide-arch,[^{]+\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/);
    expect(css).toMatch(/\.brand-guide\s*\{[^}]*padding:\s*env\(safe-area-inset-top\) env\(safe-area-inset-right\) env\(safe-area-inset-bottom\) env\(safe-area-inset-left\);/);
    expect(layout).toContain('viewportFit: "cover"');
    expect(css).toContain(".brand-guide-base { z-index: 10; }");
    expect(css).toContain(".brand-guide-paper { z-index: 34;");
    expect(css).toContain(".brand-guide-window-mask { z-index: 25;");
    expect(css).not.toContain("--guide-stage-gutter");
    expect(css).not.toContain(".brand-guide-surround");
    expect(guide).not.toContain("brand-guide-surround");
    expect(guide).not.toContain('data-artwork-source="layered-guide-texture"');
    expect(css).not.toContain("guide-initial-frame-out");
    expect(css).not.toContain("guide-final-frame-in");
  });

  it("anchors the static upward-swipe hint at the lower center", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(css).toContain("--guide-entry-hint-width: 43.4%;");
    expect(css).toContain("--guide-entry-hint-bottom: 2.7%;");
    expect(css).toContain(".brand-guide-entry-hint { position: absolute; z-index: 40; left: 50%; bottom: var(--guide-entry-hint-bottom);");
    expect(guide).toContain('src={assetUrl("swipe-up-hint-v2.png")}');
    expect(guide).toContain("width={868} height={260}");
    expect(guide).not.toContain('assetUrl("swipe-up-hint.png")');
    expect(css).not.toContain("guide-hint-float");
  });

  it.each([
    [320, 568], [360, 640], [375, 667], [375, 812], [390, 844],
    [393, 797], [393, 852], [414, 896], [430, 932], [768, 1024], [766, 1472],
  ])("covers a %ix%i guide safe-content stage without distorting the 750x1625 canvas", (width, height) => {
    const stageWidth = Math.min(width, 750);
    const scale = Math.max(stageWidth / 750, height / 1625);
    const layerWidth = 750 * scale;
    const layerHeight = 1625 * scale;
    expect(layerWidth).toBeGreaterThanOrEqual(stageWidth - 1e-9);
    expect(layerHeight).toBeGreaterThanOrEqual(height - 1e-9);
    expect(Math.min(layerWidth - stageWidth, layerHeight - height)).toBeCloseTo(0, 8);
    expect(layerWidth / layerHeight).toBeCloseTo(750 / 1625, 8);
  });

  it("keeps the new guide hint static while unlocking entry after the papers", () => {
    expect(h5MotionTiming.guide.swipeReadyMs).toBe(
      h5MotionTiming.guide.paperStartMs + 220 + h5MotionTiming.guide.paperDurationMs,
    );
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain("@keyframes guide-hint-in");
    expect(css).toContain(".brand-guide.is-reduced .brand-guide-fallback { visibility: visible; opacity: 1; }");
    expect(css).toContain(".brand-guide.is-reduced .brand-guide-entry-hint,");
    expect(css).toContain("@keyframes guide-blink-closed { from { opacity: 0; } to { opacity: 1; } }");
  });

  it("keeps the guide-to-archive handoff continuous and reveals homepage layers in reference order", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const routeTransition = readFileSync("src/components/h5/guide-route-transition.ts", "utf8");
    expect(css).toContain(".brand-guide.is-leaving { opacity: 0; transform: translate3d(0,0,0);");
    expect(css).toContain('.reports-archive.reports-entry-transition[data-guide-entry="reference-staged"] { animation: none; }');
    expect(css).not.toContain("@keyframes guide-route-layer-reveal");
    expect(css).toContain("#h5-guide-route-buffer-host");
    expect(layout).toContain('id="h5-guide-route-buffer-host"');
    expect(guide).toContain("prepareGuideRouteContinuity();");
    expect(guide).toContain("navigateWithGuideContinuity(() => router.push");
    expect(reports).toContain("announceGuideRouteReady();");
    expect(reports).toContain('settleSelector=".reports-archive-final"');
    expect(reports).toContain("revealDelayMs={160}");
    expect(reports).toContain('data-guide-entry={guideEntry ? "reference-staged" : undefined}');
    expect(artwork).toContain("data-guide-entry-stage={layerEntryStage(layer.id)}");
    expect(routeTransition).toContain("guideRouteBufferReleaseDurationMs = 220");
    expect(routeTransition).toContain("guideRouteStageDurationMs = 680");
    expect(routeTransition).toContain('root.setAttribute(guideRouteEntryAttribute, "revealing")');
    expect(routeTransition).toContain("root.removeAttribute(guideRouteEntryAttribute)");
    expect(css).not.toContain("translate3d(100%,0,0)");
  });

  it("moves the homepage left while the ready detail page enters from the right", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const archive = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    const routeTransition = readFileSync("src/components/h5/category-route-transition.ts", "utf8");

    expect(css).toContain('.category-page-final[data-route-entry="reports-archive"] { animation: category-detail-enter-from-right');
    expect(css).toContain("transform: translate3d(var(--category-route-entry-distance),0,0);");
    expect(css).toContain('.category-page-final[data-route-entry="reports-archive-buffer"]');
    expect(css).toContain("#h5-category-route-buffer-host");
    expect(css).toContain(".h5-category-route-buffer.is-moving");
    expect(css).toContain(".h5-category-route-buffer.is-releasing");
    expect(css).toContain("@keyframes category-route-buffer-enter-from-right");
    expect(css).toContain("transform: translate3d(-100dvw,0,0)");
    expect(css).toContain("transform: translate3d(100dvw,0,0)");
    expect(css).toContain("from { opacity: .72;");
    expect(css).toContain("@keyframes archive-selected-module-extract-left");
    expect(css).not.toContain("archive-selected-module-extract-up");
    expect(css).toContain(".reports-archive-source-layer.archive-module-exit-layer");
    expect(css).toContain(".archive-section-title-group.archive-module-exit-layer");
    expect(css).not.toContain("@keyframes archive-category-exit-up-fade");
    expect(archive).toContain("document.documentElement.setAttribute(categoryRouteEntryAttribute, module.slug);");
    expect(archive).toContain("navigateWithCategoryContinuity(() => router.push");
    expect(archive).toContain("data-exit-slug={exitingSlug ?? undefined}");
    expect(artwork).toContain('"module-2-review-folder": "review-assurance"');
    expect(category).toContain("data-route-entry={routeEntrySource ?? undefined}");
    expect(category).toContain("categoryRouteBufferedEntrySource");
    expect(category).toContain("announceCategoryRouteReady();");
    expect(routeTransition).toContain("prepareCategoryRouteContinuity");
    expect(routeTransition).toContain("freezeClone");
    expect(routeTransition).toContain("archiveModuleNavigationDelayMs = 220");
    expect(routeTransition).not.toContain("startViewTransition");
  });

  it.each([
    [320, 568], [360, 640], [375, 667], [375, 812], [390, 844],
    [393, 852], [414, 896], [430, 932],
  ])("contains the complete 2000x4333 detail canvas inside a %ix%i viewport", (width, height) => {
    const scale = Math.min(width / 2000, height / 4333);
    const canvasWidth = 2000 * scale;
    const canvasHeight = 4333 * scale;
    expect(canvasWidth).toBeLessThanOrEqual(width + Number.EPSILON);
    expect(canvasHeight).toBeLessThanOrEqual(height + Number.EPSILON);
    expect(canvasWidth / canvasHeight).toBeCloseTo(2000 / 4333, 8);
    const css = readFileSync("src/app/globals.css", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    expect(css).toContain(".category-page-viewport { position: relative;");
    expect(css).toContain("inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);");
    expect(css).toContain("width: min(100%, 46.1574cqh);");
    expect(css).toContain('html[data-h5-page-lock="category"]');
    expect(css).toContain("aspect-ratio: 2000 / 4333;");
    expect(css).toContain("container-type: inline-size;");
    expect(css).toContain('background-image: url("/design/final-v1/category-runtime/category-paper-base.jpg")');
    expect(css).toContain("background-position: center -1.754cqh;");
    expect(css).toContain("background-size: auto 100cqh;");
    expect(css).toContain("overflow: visible;");
    expect(category).toContain('data-artwork-source="layered-components"');
    expect(category).toContain('data-category-layer={layer.id}');
    expect(category).not.toContain("-source.jpg");
    expect(category).not.toContain('"--category-page-background-image"');
    expect(category).toContain('root.setAttribute("data-h5-page-lock", "category")');
    expect(category).toContain("window.scrollTo(0, 0)");
    expect(category).toContain('className="category-page-viewport"');
  });

  it("uses the supplied data-loading GIF as an adaptive route and asset buffer", () => {
    const experience = readFileSync("src/components/h5/GuideExperience.tsx", "utf8");
    const adaptiveGate = readFileSync("src/components/h5/AdaptiveReadinessGate.tsx", "utf8");
    const runtimeBuffer = readFileSync("src/components/h5/RuntimeLoadingBuffer.tsx", "utf8");
    const globalLoading = readFileSync("src/app/loading.tsx", "utf8");
    const route = readFileSync("src/app/go/page.tsx", "utf8");
    const gif = readFileSync("public/design/guide/data-loading-buffer.gif");
    const css = readFileSync("src/app/globals.css", "utf8");

    expect([gif.readUInt16LE(6), gif.readUInt16LE(8)]).toEqual([2000, 4334]);
    expect(route).toContain("<GuideExperience/>");
    expect(experience).not.toContain('fetch("/api/public/content"');
    expect(experience).toContain("preloadHomepageAssets(homepageCriticalWarmRequests)");
    expect(experience).toContain("preloadHomepageAssets(homepageDeferredWarmRequests)");
    expect(experience).toContain("requests={guideReadinessRequests}");
    expect(experience).toContain("archiveArtworkCriticalAssets");
    expect(experience).toContain("archiveArtworkDeferredAssets");
    expect(experience).toContain("archiveSectionTitleWarmAssets");
    expect(experience).toContain("priority: \"high\" as const");
    expect(experience).not.toContain("loadingGifDurationMs");
    expect(experience).not.toContain("publicDataWarmupTimeoutMs");
    expect(adaptiveGate).toContain("preloadHomepageAssets(requests)");
    expect(adaptiveGate).toContain("settleRenderedContent(settleSelector, settleFrames)");
    expect(adaptiveGate).toContain('root.querySelectorAll<HTMLImageElement>("img")');
    expect(adaptiveGate).toContain("document.fonts?.ready");
    expect(adaptiveGate).toContain('setPhase(loadingVisible.current ? "leaving" : "ready")');
    expect(adaptiveGate).toContain('setPhase("waiting")');
    expect(runtimeBuffer).toContain('src="/design/guide/data-loading-buffer.gif"');
    expect(runtimeBuffer).toContain('fetchPriority="low"');
    expect(globalLoading).toContain("<DeferredRuntimeLoadingBuffer");
    expect(css).toContain(".runtime-loading-layer { position: fixed;");
    expect(css).toContain("z-index: 2147483600;");
    expect(css).toContain(".guide-loading-buffer.is-leaving");
    expect(css).toMatch(/\.guide-loading-buffer-stage\s*\{[^}]*width:\s*min\(100%,\s*var\(--h5-content-width\)\);[^}]*height:\s*100%;[^}]*aspect-ratio:\s*auto;/);
    expect(css).toMatch(/\.guide-loading-buffer-gif,\s*\.guide-loading-buffer-poster\s*\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/);
    expect(css).toContain(".guide-loading-buffer-poster { visibility: visible; }");
  });

  it("keeps the supplied window frame above the masked character and incoming papers beneath the envelope foreground", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(css).toContain(".brand-guide-character { z-index: 20;");
    expect(css).toContain(".brand-guide-window-mask { z-index: 25;");
    expect(css).toContain(".brand-guide-arch { z-index: 27;");
    expect(css).toContain(".brand-guide-foreground-top { z-index: 35;");
    expect(css).toContain(".brand-guide-paper { z-index: 34;");
    expect(guide).toContain("const firstFrame = <GuideLayers animated={false}");
    expect(guide).toContain("<GuideLayers animated={false} onError={onLayerError}/>");
    expect(guide).not.toContain("guide-first-frame.webp");
    expect(css).not.toContain("brand-guide-paper-arm-occlusion");
    expect(css).not.toContain("brand-guide-paper-right-occlusion");
    expect(css).not.toContain("guide-right-arm-mask.webp");
    expect(css).toContain("@keyframes guide-paper-from-right { from { transform: translate3d(49.133333%,-2.246154%,0) rotate(3.4deg); } to { transform: translate3d(10.133333%,-1.046154%,0) rotate(0); } }");
  });

  it("keeps archive motion visible long enough to be perceived", () => {
    expect(h5MotionTiming.archiveLatestCircle.delayMs).toBeGreaterThanOrEqual(200);
    expect(h5MotionTiming.archiveLatestCircle.delayMs).toBeLessThanOrEqual(300);
    expect(h5MotionTiming.archiveLatestCircle.durationMs).toBeGreaterThanOrEqual(700);
    expect(h5MotionTiming.archiveLatestCircle.durationMs).toBeLessThanOrEqual(900);
    expect(h5MotionTiming.archiveUnlockTab.revealDistancePx).toBe(180);
    expect(h5MotionTiming.archiveUnlockTab.followMs).toBe(90);
    expect(h5MotionTiming.archiveResultColor.delayAfterCircleMs).toBeGreaterThanOrEqual(150);
    expect(h5MotionTiming.archiveResultColor.delayAfterCircleMs).toBeLessThanOrEqual(250);
    expect(h5MotionTiming.archiveResultColor.durationMs).toBeGreaterThanOrEqual(600);
    expect(h5MotionTiming.archiveResultColor.durationMs).toBeLessThanOrEqual(800);
    expect(h5MotionTiming.archiveStoryCopy.lineDurationMs).toBe(900);
    expect(h5MotionTiming.archiveStoryCopy.lineStepMs).toBe(500);
    expect(h5MotionTiming.archiveStoryCopy.lineOffsetsMs).toEqual([0, -100, 0, -200]);
    expect(h5MotionTiming.archiveStoryCopy.lineStepMs + h5MotionTiming.archiveStoryCopy.lineOffsetsMs[3]).toBeLessThan(h5MotionTiming.archiveStoryCopy.lineStepMs);
    const lineStarts = h5MotionTiming.archiveStoryCopy.lineOffsetsMs.map(
      (offset, index) => index * h5MotionTiming.archiveStoryCopy.lineStepMs + offset,
    );
    expect(
      h5MotionTiming.archiveStoryCopy.delayMs
      + Math.max(...lineStarts)
      + h5MotionTiming.archiveStoryCopy.lineDurationMs,
    ).toBe(2350);
    const component = readFileSync("src/components/h5/motion/modules/ArchiveStoryCopyMotion.tsx", "utf8");
    expect(component).toContain("if (!ready || !started || !visible || complete) return;");
    expect(component).toContain("remainingMs.current = Math.max(0, remainingMs.current - (performance.now() - startedAt));");
  });

  it("wires ReportsArchive to layered originals instead of the retired reference composite", () => {
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    expect(reports).toContain("ArchiveArtwork, archiveArtworkCriticalAssets, archiveArtworkDeferredAssets");
    expect(reports).toContain("<ArchiveArtwork preview={preview} exitingSlug={exitingSlug} />");
    expect(reports).not.toContain("archive-reference.webp");
    expect(artwork).toContain('data-artwork-source="layered-originals"');
    expect(artwork).toContain('const archiveOutputRoot = "/design/final-v1/长图输出"');
    expect(artwork).toContain('moduleTwoAsset("资源 10.png")');
    expect(artwork).toContain('moduleTwoAsset("资源 20.png")');
    expect(artwork).not.toContain("docs/input");
    expect(artwork).toContain('const archiveRuntimeRoot = "/design/final-v1/archive/runtime-layers"');
    expect(artwork).toContain("module-3-output.webp");
    expect(artwork).toContain('top: 4374.5, width: 1000, height: 1182.5, unoptimized: true');
    expect(artwork).toContain('loading={layer.eager ? undefined : "lazy"}');
    expect(artwork).toContain("archiveArtworkCriticalAssets");
    expect(artwork).toContain("archiveArtworkDeferredAssets");
    for (let resource = 11; resource <= 19; resource += 1) {
      expect(artwork).not.toContain(`moduleTwoAsset("资源 ${resource}.png")`);
    }
  });

  it("uses the four supplied GIF motions at the matching archive fish positions", () => {
    const component = readFileSync("src/components/h5/motion/modules/ArchiveFishFloatMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(component).toContain("data-fish-index={index + 1}");
    expect(component.match(/fish-motion-0[1-4]\.gif/g)).toHaveLength(4);
    expect(component).toContain('x: 54, y: 4408, width: 140.5, height: 88');
    expect(component).toContain('x: 791, y: 4403, width: 140.5, height: 88');
    expect(component).toContain("ready && visible");
    expect(component).toContain("data-fish-nearby={nearby}");
    expect(component).toContain("unoptimized onError={handleGifError}");
    expect(component).toContain("/motion/archive-runtime/fish-clean-patch.png");
    expect(component).not.toContain("archive-base-clean.webp");
    expect(css).toContain(".archive-fish-motion-gif");
    expect(css).not.toContain("@keyframes archive-fish-float");
    expect(css).not.toContain("--archive-fish-duration");
  });

  it("slows every archive fish GIF frame without adding heavier replacement assets", () => {
    for (const index of [1, 2, 3, 4]) {
      const name = `fish-motion-0${index}.gif`;
      const gif = readFileSync(`public/design/final-v1/motion/archive-runtime/${name}`);
      const delays: number[] = [];
      for (let offset = 0; offset <= gif.length - 8; offset += 1) {
        if (gif[offset] === 0x21 && gif[offset + 1] === 0xf9 && gif[offset + 2] === 0x04) delays.push(gif.readUInt16LE(offset + 4));
      }
      expect(delays).toHaveLength(24);
      expect(new Set(delays)).toEqual(new Set([36]));
      expect(gif.byteLength).toBeLessThan(22_000);
    }
  });

  it("places the archive unlock ribbon below the yellow page and reveals it from real scroll progress", () => {
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const component = readFileSync("src/components/h5/motion/modules/ArchiveUnlockTabMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(artwork).not.toContain('moduleOneLayer("module-1-swipe"');
    expect(artwork).toContain("<ArchiveUnlockTabMotion preview={preview} />");
    expect(artwork).toContain('id === "module-1-folder-back"');
    expect(artwork).toContain('id === "module-1-folder-front"');
    expect(component).toContain("accumulated.current / h5MotionTiming.archiveUnlockTab.revealDistancePx");
    expect(component).toContain("data-unlock-progress");
    expect(component).not.toContain("sessionStorage");
    expect(component).toContain("/design/final-v1/长图输出/长图模块1/h5长图-下滑条.png");
    expect(component).toContain("width={3034}");
    expect(component).toContain("height={4334}");
    expect(component).toContain("1817 / 5557");
    expect(component).toContain("5557 - 1860");
    expect(css).toContain("z-index: 20");
    expect(css).toContain("left: -40.6%");
    expect(css).toContain("width: 151.7%");
    expect(css).toContain("var(--archive-unlock-current-bottom)");
  });

  it("replaces the retired decoration and sequences the three supplied title posters with compositor bounce motion", () => {
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const component = readFileSync("src/components/h5/motion/modules/ArchiveSectionTitleMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(reports).toContain("ArchiveSectionTitleMotion, archiveSectionTitleWarmAssets");
    expect(reports).toContain("<ArchiveSectionTitleMotion preview={preview} exitingSlug={exitingSlug} />");
    expect(component).toContain("/design/final-v1/motion/archive-runtime");
    expect(component).toContain("section-click-cue.gif");
    expect(component).not.toContain("section-title-inspection.gif");
    expect(component).not.toContain("section-title-review.gif");
    expect(component).not.toContain("section-title-production.gif");
    expect(component.match(/section-title-(inspection|review|production)-poster\.webp/g)).toHaveLength(3);
    expect(component).toContain("archiveTitleBounceDurationMs = 1217");
    expect(component).not.toContain("window.setInterval");
    expect(component).toContain('data-title-sequence-mode={running ? "css-compositor-loop" : "paused"}');
    expect(component).toContain("data-title-sequence-order={sequenceIndex + 1}");
    expect(component).not.toContain("const renderAssets = nearby || visible");
    expect(component).toContain('data-title-ready="true"');
    expect(component).toContain('data-title-render-layer="poster"');
    expect(component).not.toContain("sequenceCycle}`");
    expect(component.match(/section-number-(inspection|review|production)-(ring|digit)\.png/g)).toHaveLength(6);
    const clickCue = readFileSync("public/design/final-v1/motion/archive-runtime/section-click-cue.gif");
    expect([clickCue.readUInt16LE(6), clickCue.readUInt16LE(8)]).toEqual([840, 412]);
    const pngDimensions = (name: string) => {
      const png = readFileSync(`public/design/final-v1/motion/archive-runtime/${name}`);
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    expect(pngDimensions("section-number-inspection-ring.png")).toEqual([161, 169]);
    expect(pngDimensions("section-number-inspection-digit.png")).toEqual([51, 114]);
    expect(pngDimensions("section-number-review-ring.png")).toEqual([161, 169]);
    expect(pngDimensions("section-number-review-digit.png")).toEqual([87, 110]);
    expect(pngDimensions("section-number-production-ring.png")).toEqual([161, 169]);
    expect(pngDimensions("section-number-production-digit.png")).toEqual([81, 118]);
    expect(artwork).not.toContain('moduleTwoAsset("资源 4.png")');
    expect(artwork).not.toContain('moduleTwoAsset("资源 5.png")');
    expect(artwork).not.toContain('moduleTwoAsset("资源 6.png")');
    expect(artwork).not.toContain('moduleTwoAsset("资源 7.png")');
    expect(component).not.toContain("title-clean-");
    expect(component).not.toContain("cleanPatch");
    expect(component).toContain("left: 533");
    expect(component).toContain("top: 2545.5");
    expect(component).toContain("left: 556");
    expect(component).toContain("top: 2779.5");
    expect(component).toContain("left: 94");
    expect(component).toContain("top: 3155.5");
    expect(component).toContain("left: 542.5");
    expect(component).toContain("top: 3518");
    expect(component).toContain("left: 475, top: 2787.5");
    expect(component).toContain("left: 10.5, top: 3168");
    expect(component).toContain("left: 28, top: 3181.5");
    expect(component).toContain("left: 468.5, top: 3532.5");
    expect(component).toContain("height: `${group.height / masterHeight * 100}%`");
    expect(component).not.toContain("aspectRatio:");
    expect(component).toContain('rootMargin: "45% 0px"');
    expect(component).toContain("h5MotionModules.archiveSectionTitle");
    expect(component).toContain("IntersectionObserver");
    expect(css).not.toContain("archive-section-title-clean-patch");
    expect(css).toContain("--archive-title-bounce-duration: 1217ms");
    expect(css).toContain("--archive-title-sequence-duration: 3651ms");
    expect(css).toContain("@keyframes archive-section-title-bounce");
    expect(css).toContain('data-title-sequence-running="true"');
    expect(css).toContain("calc(var(--archive-title-sequence-index) * var(--archive-title-bounce-duration)) infinite both");
    expect(css).toContain("10.5% { transform: translate3d(0,3.2%,0) scale3d(.9,.9,1)");
    expect(css).toContain("17.5% { transform: translate3d(0,-3.5%,0) scale3d(.985,.985,1)");
    expect(css).toContain("animation-timing-function: cubic-bezier(.4,0,.2,1)");
    expect(css).toContain("animation-play-state: paused");
    expect(css).toContain('data-title-sequence-running="true"] .archive-section-title-poster { animation-play-state: running; }');
    expect(css).toContain("transform-origin: 50% 72%");
    expect(css).toContain("contain: paint");
    expect(css).toContain("backface-visibility: hidden");
    expect(css).toContain("will-change: transform");
    expect(css).not.toContain(".archive-section-title-gif");
    expect(css).toContain(".archive-section-click-cue-gif { z-index: 0; }");
    expect(css).toContain(".archive-section-number-part");
  });

  it("draws the archive circle along an SVG stroke instead of a rectangular reveal", () => {
    const component = readFileSync("src/components/h5/motion/modules/ArchiveLatestCircle.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(component).toContain("archive-latest-circle-stroke");
    expect(component).toContain("circleStrokePath");
    expect(css).toContain("stroke-dashoffset");
    expect(css).not.toContain("@keyframes archive-latest-circle-draw");
  });

  it("fades the aligned result patch after the circle completes without animating full-page canvases", () => {
    const component = readFileSync("src/components/h5/motion/modules/ArchiveResultColorMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(component).toContain("archive-result-normal-patch.webp");
    expect(component).toContain("archive-result-passed-patch.webp");
    expect(component).toContain("masterWidth={628} masterHeight={113}");
    expect(component).toContain("archiveLatestCircle.durationMs");
    expect(css).toContain("top: 32.751485%");
    expect(css).not.toContain("@keyframes archive-result-normal-out");
    expect(css).toContain("@keyframes archive-result-passed-in");
    });
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    expect(category).toContain("H5_MOTION_ENABLED && h5MotionModules.categoryEnter && !preview");
    expect(category).toContain("if (!motionEnabled) { router.push(destination); return; }");
  });
