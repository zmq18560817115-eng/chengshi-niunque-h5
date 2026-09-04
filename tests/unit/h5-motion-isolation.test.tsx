import { act, render, screen, waitFor } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { MotionBoundary } from "@/components/h5/motion/MotionBoundary";
import { MotionStage } from "@/components/h5/motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "@/components/h5/motion/motion-config";
import {
  guideArchiveBatchDelayMs,
  guideArchiveEntryTiming,
  getGuideTransitionVisualState,
  guideRouteBufferReleaseDurationMs,
  guideRouteCommitDurationMs,
  guideRouteStageDurationMs,
  guideRouteStageSettleMs,
  guideTransitionTravelRatio,
} from "@/components/h5/guide-route-transition";

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

  it("crossfades the decoded guide composition while preserving the static failure fallback", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(css).toContain(".brand-guide-live-stage { position: absolute; z-index: 2; inset: 0; opacity: 0;");
    expect(css).toContain(".brand-guide.is-ready .brand-guide-live-stage { opacity: 1; }");
    expect(css).toContain(".brand-guide.is-ready[data-guide-profile=\"portrait-standard\"] .brand-guide-fallback { opacity: 0; }");
    expect(css).toContain(".brand-guide.is-failed .brand-guide-fallback { visibility: visible; opacity: 1; }");
    expect(guide).toContain("function markImageDecoded(image: HTMLImageElement");
    expect(guide).toContain("requiredReadyKeys.every((required) => readyLayers.current.has(required))");
    expect(guide).toContain('setAssetStatus("ready")');
    expect(guide).toContain('"guide-static-foreground-v2.webp"');
    expect(guide).toContain('"guide-first-frame.webp"');
    expect(guide).not.toContain("MotionStage");
  });

  it("prefetches the archive and keeps guide navigation inside the Next client router", () => {
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(guide).toContain('router.prefetch("/reports")');
    expect(guide).toContain('replaceHierarchyRoute(router, "/reports")');
    expect(guide).not.toContain('window.location.assign("/reports")');
  });

  it("uses one bounded 750px content frame with a shared portrait canvas and a dedicated landscape composition", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guideAdaptation = readFileSync("src/app/guide-adaptation.vw.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(css).toContain(".brand-guide-swipe-track { position: absolute;");
    expect(css).toMatch(/\.brand-guide-swipe-track\s*\{[^}]*height:\s*100%;/);
    expect(css).toMatch(/\.brand-guide-stage,\s*\.brand-guide-destination-preview\s*\{[^}]*position:\s*absolute;[^}]*width:\s*100%;[^}]*height:\s*100%;/);
    expect(css).toMatch(/\.brand-guide-artwork\s*\{[^}]*width:\s*min\(100%,var\(--h5-content-width\)\);/);
    expect(guideAdaptation).toMatch(/\.brand-guide-portrait-scene,\s*\.h5-guide-route-snapshot\.is-portrait\s*\{[^}]*width:\s*750px;[^}]*height:\s*1625px;[^}]*aspect-ratio:\s*auto;/);
    expect(750 / 1625).toBeCloseTo(6 / 13, 10);
    expect(layout).toMatch(/import "\.\/globals\.css";\s*import "\.\/guide-adaptation\.vw\.css";/);
    expect(css).not.toContain(".brand-guide-portrait-scene.is-compact-fallback");
    expect(css).toMatch(/\.brand-guide-arch,\s*\.brand-guide-paper,\s*\.brand-guide-character,\s*\.brand-guide-foreground-top,\s*\.brand-guide-fallback\s*\{[^}]*object-fit:\s*fill;[^}]*object-position:\s*center;/);
    expect(css).not.toContain(".guide-compact-portrait-composition");
    expect(css).toContain(".guide-landscape-composition { position: absolute; inset: 0; display: block;");
    expect(css).toContain(".guide-landscape-logo");
    expect(css).toContain(".guide-landscape-character");
    expect(css).toContain(".guide-landscape-envelope");
    expect(guide).not.toContain("GuideCompactPortraitComposition");
    expect(guide).toContain("GuideLandscapeComposition");
    expect(guide).toContain('? "portrait-compact" : "portrait-standard"');
    expect(guide).toContain('setLayoutProfile("landscape")');
    expect(css).toContain('background-image: url("/design/guide/guide-background.webp")');
    expect(css).toMatch(/\.guide-loading-buffer-poster\s*\{[^}]*object-fit:\s*cover;/);
    expect(css).not.toContain(".guide-loading-buffer-gif");
    expect(css).toMatch(/\.guide-loading-buffer-stage\s*\{[^}]*background-image:\s*url\("\/design\/guide\/guide-background\.webp"\);/);
    expect(css).toMatch(/\.brand-guide\s*\{[^}]*width:\s*100%;[^}]*touch-action:\s*none;/);
    expect(layout).toContain('viewportFit: "cover"');
    expect(css).toContain(".brand-guide-paper { z-index: 34;");
    expect(css).toMatch(/\.brand-guide-window-mask\s*\{[^}]*z-index:\s*25;[^}]*object-fit:\s*fill;/);
    expect(guide).toContain('"guide-window-mask.webp"');
    expect(existsSync("public/design/guide/guide-window-mask.webp")).toBe(true);
    expect(existsSync("public/design/guide/guide-static-foreground-v2.webp")).toBe(true);
    expect(guide).not.toContain("brand-guide-base");
    expect(css).not.toContain("brand-guide-portrait-edge-bleed");
    expect(guide).not.toContain("GuidePortraitEdgeBleed");
    expect(css).toMatch(/\.h5-guide-route-portrait-snapshot\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*fill;/);
    expect(css).not.toMatch(/\.brand-guide-portrait-scene[^{}]*\{[^}]*mask-image:/);
    expect(css).not.toMatch(/\.brand-guide-paper, \.brand-guide-character, \.brand-guide-foreground-top[^{}]*\{[^}]*mask-image:/);
    expect(css).not.toContain("--guide-swipe-offset");
    expect(css).not.toMatch(/\.(?:brand-guide|brand-guide-stage|brand-guide-artwork|brand-guide-destination-preview|h5-guide-route-buffer|h5-guide-route-panel)\s*\{[^}]*\bfilter:\s*blur\(/);
    expect(css).not.toContain(".brand-guide-surround");
    expect(guide).not.toContain("brand-guide-surround");
    expect(guide).not.toContain('data-artwork-source="layered-guide-texture"');
    expect(css).not.toContain("guide-initial-frame-out");
    expect(css).not.toContain("guide-final-frame-in");
  });

  it("anchors the supplied upward-swipe hint at the lower center and animates only its CSS layer", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(css).toContain("--guide-entry-hint-width: 43.4%;");
    expect(css).toContain("--guide-entry-hint-bottom: max(3.3%, env(safe-area-inset-bottom));");
    expect(css).toContain(".brand-guide-entry-hint { position: absolute; z-index: 40; left: 50%; bottom: var(--guide-entry-hint-bottom);");
    expect(guide).toContain('src={assetUrl("swipe-up-hint-v2.png")}');
    expect(guide).toContain("width={868} height={260}");
    expect(guide).not.toContain('assetUrl("swipe-up-hint.png")');
    const liveStage = guide.match(
      /<div className="brand-guide-live-stage"[^>]*>([\s\S]*?)<\/div>}/,
    )?.[1] ?? "";
    expect(liveStage).toContain("<GuideLayers");
    expect(liveStage).not.toContain("GuideEntryHint");
    expect(guide).toMatch(
      /<div className="brand-guide-portrait-scene">[\s\S]*?<\/div>\s*{mountLivePortrait && <GuideEntryHint/,
    );
    expect(css).toContain("@keyframes guide-entry-hint-float");
    expect(css).toContain('.brand-guide-stage[data-swipe-state="ready"] .brand-guide-entry-hint');
  });

  it.each([
    [320, 568], [360, 640], [375, 667], [375, 812], [390, 844],
    [393, 797], [393, 852], [412, 892], [414, 896], [428, 926], [430, 932], [768, 1024], [766, 1472],
  ])("maps every %ix%i portrait width to the shared 6:13 guide canvas", (width) => {
    const canvasHeight = width * 13 / 6;
    const landmarks = [
      { left: 136 / 750, top: 116 / 1625, right: 625 / 750, bottom: 268 / 1625 },
      { left: 56 / 750, top: 380 / 1625, right: 738 / 750, bottom: 1074 / 1625 },
      { left: 60.4 / 750, top: 968.6 / 1625, right: 1, bottom: 1572.8 / 1625 },
      { left: 212 / 750, top: 1473 / 1625, right: 538 / 750, bottom: 1571 / 1625 },
    ];
    for (const landmark of landmarks) {
      expect(landmark.left * width).toBeGreaterThanOrEqual(0);
      expect(landmark.top * canvasHeight).toBeGreaterThanOrEqual(0);
      expect(landmark.right * width).toBeLessThanOrEqual(width);
      expect(landmark.bottom * canvasHeight).toBeLessThanOrEqual(canvasHeight);
    }
  });

  it("starts the light guide-hint loop only after entry unlocks", () => {
    expect(h5MotionTiming.guide.swipeReadyMs).toBe(
      h5MotionTiming.guide.paperStartMs + 220 + h5MotionTiming.guide.paperDurationMs,
    );
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("@keyframes guide-entry-hint-float");
    expect(css).toContain("@keyframes guide-entry-hint-accepted");
    expect(css).toContain(".brand-guide.is-reduced .brand-guide-fallback { visibility: visible; opacity: 1; }");
    expect(css).toContain(".brand-guide.is-reduced .brand-guide-entry-hint,");
    expect(css).toContain("@keyframes guide-blink-closed { 0%, 100% { opacity: 0; } 35%, 65% { opacity: 1; } }");
  });

  it("keeps the guide-to-archive handoff continuous and reveals homepage layers in reference order", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const transitionVisual = readFileSync("src/components/h5/archive-entry-transition-visual.ts", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const routeTransition = readFileSync("src/components/h5/guide-route-transition.ts", "utf8");
    expect(css).toContain(".brand-guide.is-leaving { pointer-events: none; }");
    expect(css).toContain(".brand-guide.is-dragging .brand-guide-stage, .brand-guide.is-dragging .brand-guide-destination-preview { will-change: transform, opacity; }");
    expect(css).toContain(".brand-guide.is-settling .brand-guide-stage, .brand-guide.is-settling .brand-guide-destination-preview { transition: transform 240ms");
    expect(transitionVisual).toContain('book.dataset.guideDestinationGroup = "archive-book"');
    expect(transitionVisual).toContain('batch.dataset.guideDestinationGroup = "latest-batch"');
    expect(css).toContain(".reports-archive.reports-entry-transition[data-guide-entry] { animation: none; }");
    expect(reports).toContain("enteredFromGuide.current = true;");
    expect(reports).toContain('data-guide-entry={enteredFromGuide.current ? (guideEntry ? "reference-staged" : "complete") : undefined}');
    expect(css).toContain("@keyframes archive-guide-entry-rise { from { transform: translate3d(0,var(--guide-route-remaining-distance),0); } to { transform: translate3d(0,0,0); } }");
    expect(css).toContain("@keyframes archive-guide-entry-fade { from { opacity: 0; } to { opacity: 1; } }");
    expect(css).toContain('.h5-guide-route-buffer .h5-guide-archive-entry-group.is-batch { opacity: var(--guide-route-batch-start-opacity,0); transform: translate3d(0,var(--guide-route-batch-start-y,4cqw),0); }');
    expect(css).toContain('.reports-archive-final[data-guide-entry]:not([data-archive-artwork-failed="true"]) .reports-archive-reference-fallback');
    expect(css).toContain('html[data-guide-route-entry] .reports-archive-final .reports-archive-entry-book,');
    expect(css).toContain('.reports-archive-final[data-guide-entry] .reports-archive-entry-book,');
    expect(css).toContain("--guide-route-transition-easing: cubic-bezier(.25,.1,.25,1);");
    expect(css).toContain('.h5-guide-route-buffer.is-committing .h5-guide-archive-entry-group.is-batch { opacity: 1; transform: translate3d(0,0,0); transition: opacity var(--guide-route-batch-duration,504ms) ease-out var(--guide-route-batch-delay,504ms)');
    expect(css).toContain('.reports-archive-final[data-guide-entry] .reports-archive-entry-batch { opacity: 1; transform: translate3d(0,0,0); animation: none; will-change: auto; }');
    expect(css).toContain(".h5-guide-route-buffer.is-releasing { opacity: 0; transform: translate3d(0,0,0);");
    expect(css).toContain("transition: opacity var(--guide-route-buffer-release-duration) ease-out;");
    expect(css).toContain(".h5-guide-route-buffer.is-committing .h5-guide-route-guide-panel { opacity: .08;");
    expect(css).toContain(".h5-guide-route-buffer.is-committing .h5-guide-route-destination-panel { opacity: 1;");
    expect(css).toMatch(/\.reports-archive-entry-group\s*\{[^}]*height:\s*38\.9958610761%;[^}]*overflow:\s*hidden;/);
    expect(css).toContain(".reports-archive-entry-coordinate-layer { position: absolute; top: 0; left: 0; width: 100%; height: 256.4374711583%; }");
    expect(css).toContain("html[data-guide-route-entry], html[data-guide-route-entry] body { width: 100%; height: 100%; overflow: hidden;");
    expect(css).not.toContain("opacity: .94; transform: translate3d(0,clamp(48px,12dvh,112px),0)");
    expect(css).not.toContain("@keyframes guide-route-layer-reveal");
    expect(css).toContain("#h5-guide-route-buffer-host");
    expect(layout).toContain('id="h5-guide-route-buffer-host"');
    expect(guide).toContain('const prepared = await prepareGuideRouteContinuity(startProgress, destinationStatus === "fallback");');
    expect(guide).toContain("if (!prepared)");
    expect(guide).toContain("setTransitionError(true)");
    expect(guide).toContain("navigateWithGuideContinuity(() => replaceHierarchyRoute");
    expect(reports).toContain("useLayoutEffect(() => {");
    expect(reports).toContain("announceGuideRouteReady();");
    expect(reports).toContain("sessionStorage.removeItem(\"reports-scroll-y\")");
    expect(reports).toContain("setGuideEntry(false);");
    expect(reports).toContain("setDeferredMounted(true);");
    expect(reports).toContain("setDeepDeferredMounted(true);");
    expect(reports).toContain("window.addEventListener(guideRouteCompleteEvent, completeEntry, { once: true });");
    expect(reports).toContain("completionFallbackTimer = window.setTimeout(() => {");
    expect(reports).toContain("clearGuideRouteContinuity();");
    expect(reports).toContain('settleSelector=".reports-archive-final"');
    expect(reports).toContain("revealDelayMs={160}");
    expect(artwork).toContain("data-guide-entry-stage={layerEntryStage(layer.id)}");
    expect(guideRouteBufferReleaseDurationMs).toBe(520);
    expect(guideRouteCommitDurationMs).toBe(630);
    expect(guideArchiveEntryTiming.bookDurationMs).toBe(630);
    expect(guideArchiveEntryTiming.batchDurationMs).toBe(504);
    expect(guideArchiveBatchDelayMs).toBe(
      guideArchiveEntryTiming.bookDelayMs
      + guideArchiveEntryTiming.bookDurationMs * guideArchiveEntryTiming.batchOverlapProgress,
    );
    expect(guideArchiveEntryTiming.batchOverlapProgress).toBe(0.8);
    expect(guideArchiveBatchDelayMs).toBe(504);
    expect(guideRouteStageSettleMs).toBe(120);
    expect(guideRouteStageDurationMs).toBe(1128);
    expect(routeTransition).toContain('root.setAttribute(guideRouteEntryAttribute, "revealing")');
    expect(routeTransition).toContain("root.removeAttribute(guideRouteEntryAttribute)");
    expect(routeTransition).toContain('snapshot.className = `h5-guide-route-snapshot is-${guideRouteOrientation(profile)}`');
    expect(routeTransition).toContain('createTransitionImage(guideRouteSnapshotSrc, "h5-guide-route-portrait-snapshot")');
    expect(routeTransition).toContain('export const guideRouteSnapshotSrc = "/design/guide/guide-static-foreground-v2.webp"');
    expect(routeTransition).not.toContain("archive-transition-preview.webp");
    expect(routeTransition).toContain("createArchiveEntryTransitionVisual(createTransitionImage)");
    expect(routeTransition).not.toContain('dataset.guideDestinationGroup = "archive-book"');
    expect(routeTransition).not.toContain('dataset.guideDestinationGroup = "latest-batch"');
    expect(routeTransition).toContain('export async function primeGuideRouteContinuity(profileInput: GuideRouteProfile');
    expect(routeTransition).not.toContain("function createGuideCompactComposition()");
    expect(routeTransition).toContain('character.append(createTransitionImage(src, `guide-landscape-crop-master is-${name}`))');
    expect(routeTransition).not.toContain('crop("character", guideRouteSnapshotSrc)');
    expect(routeTransition).toContain('track.className = "h5-guide-route-track"');
    expect(routeTransition).toContain("Promise.all(requiredImages.map((image) => waitForTransitionImage(image)))");
    expect(routeTransition).toContain("const requiredImages = destinationFallback ? images.filter((image) => !destinationImages.includes(image)) : images;");
    expect(routeTransition).toContain("const primed = await primeGuideRouteContinuity(profile, destinationFallback);");
    expect(routeTransition).toContain("host.replaceChildren(buffer)");
    expect(routeTransition).toContain("primeGeneration += 1;");
    expect(routeTransition).toContain("void buffer.offsetWidth;");
    expect(routeTransition).toContain("const stageStartedAt = performance.now();");
    expect(routeTransition).toContain("if (expectedGeneration !== primeGeneration) return;");
    expect(routeTransition).toContain("? guideRouteReducedReleaseDurationMs");
    expect(routeTransition).toContain("? guideRouteFallbackReleaseDurationMs");
    expect(routeTransition).toContain("const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));");
    expect(routeTransition).toContain('root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);');
    expect(routeTransition).toContain('root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);');
    expect(routeTransition).toContain('root.style.setProperty("--guide-route-remaining-distance", `${remainingDistance}px`);');
    expect(routeTransition).not.toContain("cloneNode(true)");
    expect(routeTransition).not.toContain("freezeGuideSnapshot");
    expect(routeTransition).toContain('root.setAttribute(guideRouteEntryAttribute, "revealing")');
    expect(routeTransition).toContain('buffer?.classList.add("is-releasing")');
    expect(routeTransition).not.toContain("freezeClone");
    expect(css).toContain(".h5-guide-route-snapshot { container-type: size; position: absolute;");
    expect(css).toContain(".h5-guide-route-buffer.is-preparing { visibility: hidden; }");
    expect(css).toContain(".h5-guide-route-buffer.is-preparing .h5-guide-route-panel,");
    expect(css).toContain("transition: none !important;");
    expect(css).toContain(".h5-guide-archive-entry-group.is-book { z-index: 10; }");
    expect(css).toContain(".h5-guide-archive-entry-group.is-batch { z-index: 11; }");
    expect(css).not.toContain("translate3d(100%,0,0)");
    expect(css).not.toMatch(/\.h5-guide-route-track\s*\{[^}]*height:\s*200%;/);

    expect(guideTransitionTravelRatio).toBe(0.26);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const state = getGuideTransitionVisualState(progress, 812);
      expect(state.overlapRatio).toBeGreaterThanOrEqual(0.74);
      expect(state.guideOpacity + state.destinationOpacity).toBeGreaterThanOrEqual(1);
      expect(state.guideY).toBeCloseTo(-812 * guideTransitionTravelRatio * progress, 5);
      expect(state.destinationY).toBeCloseTo(812 * guideTransitionTravelRatio * (1 - progress), 5);
    }
  });

  it("keeps the complete homepage visible while the ready detail page enters from the right", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const archive = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    const routeTransition = readFileSync("src/components/h5/category-route-transition.ts", "utf8");

    expect(css).toContain('.category-page-final[data-route-entry="reports-archive"] { opacity: .72; transform: translate3d(var(--category-route-entry-distance),0,0); animation: none; }');
    expect(css).toContain("transform: translate3d(var(--category-route-entry-distance),0,0);");
    expect(css).toContain('.category-page-final[data-route-entry="reports-archive-buffer"]');
    expect(css).toContain("#h5-category-route-buffer-host");
    expect(css).toContain(".h5-category-route-buffer.is-moving");
    expect(css).toContain(".h5-category-route-buffer.is-releasing");
    expect(css).toContain("@keyframes category-route-buffer-enter-from-right");
    expect(css).toContain("transform: translate3d(-100dvw,0,0)");
    expect(css).toContain("transform: translate3d(100dvw,0,0)");
    expect(css).toContain("from { opacity: .72;");
    expect(css).not.toContain("@keyframes archive-selected-module-extract-left");
    expect(css).not.toContain("archive-selected-module-extract-up");
    expect(css).not.toContain(".reports-archive-source-layer.archive-module-exit-layer");
    expect(css).not.toContain(".archive-section-title-group.archive-module-exit-layer");
    expect(css).not.toContain("@keyframes archive-category-exit-up-fade");
    expect(archive).toContain("document.documentElement.setAttribute(categoryRouteEntryAttribute, module.slug);");
    expect(archive).toContain("navigateWithCategoryLoadingHandoff(() => pushHierarchyRoute");
    expect(archive).toContain("data-exit-slug={exitingSlug ?? undefined}");
    expect(artwork).toContain('"module-2-review-folder": "review-assurance"');
    expect(category).toContain("data-route-entry={routeEntrySource ?? undefined}");
    expect(category).toContain("categoryRouteBufferedEntrySource");
    expect(category).toContain("categoryRouteNativeEntrySource");
    expect(category).toContain("categoryRouteLoadingEntrySource");
    expect(category).toContain("loadingFeedbackOwner === attemptId");
    expect(category).not.toContain("pendingRouteEntrySource");
    expect(category).toContain("data-route-ready={routeReady || undefined}");
    expect(category).toContain("setRouteReady(true)");
    expect(category).toContain("announceCategoryRouteReady({ ...routeEntryAttempt, status: readinessFailed ? \"failed\" : \"ready\" });");
    expect(category).toContain("categoryRouteAttemptAttribute");
    expect(category).toContain("settleFrames={3} failOpen");
    expect(category).not.toContain("window.setTimeout(() => router.push(destination), 220)");
    expect(routeTransition).toContain("prepareCategoryRouteContinuity");
    expect(routeTransition).toContain("startViewTransition?.bind(viewDocument)");
    expect(routeTransition).toContain("categoryRouteNativeTransitionAttribute");
    expect(routeTransition).not.toContain("querySelectorAll<HTMLImageElement>");
    expect(routeTransition).toContain("cloneNode(true)");
    expect(routeTransition).toContain("is-category-route-buffer-clone");
    expect(routeTransition).toContain('clone.removeAttribute("data-pressed-slug")');
    expect(routeTransition).toContain("freezeCloneMotion(source, clone)");
    expect(routeTransition).toContain("payload?.attemptId === detail.attemptId && payload.slug === detail.slug");
    expect(routeTransition).toContain("bufferGeneration");
    expect(routeTransition).toContain("categoryRouteReadyEvent");
    expect(routeTransition).toContain("categoryRouteMountedEvent");
    expect(category).toContain("announceCategoryRouteMounted({ attemptId, slug: module.slug });");
    expect(css).toContain(".reports-archive-final.is-category-route-buffer-clone");
    expect(css).toContain('.category-page-final[data-route-entry="reports-archive-native"]:not(.is-leaving)');
    expect(css).toContain('.category-page-final[data-route-entry="reports-archive-loading"]:not(.is-leaving) { opacity: 1; transform: none; animation: none; }');
    expect(css).toContain("animation: none !important;");
    expect(css).toContain("html[data-category-native-transition]::view-transition-old(root)");
    expect(css).toContain('background-image: url("/design/final-v1/archive/runtime-layers/archive-paper-texture.runtime.webp")');
    expect(routeTransition).toContain("archiveModuleNavigationDelayMs = 0");
    expect(routeTransition).toContain("navigateWithCategoryLoadingHandoff");
    expect(routeTransition).toContain("createLoadingFeedback(attemptId, { immediate: true })");
    expect(archive).not.toContain("prepareCategoryRouteContinuity();");
  });

  it.each([
    [320, 568], [360, 640], [375, 667],
  ])("keeps short %ix%i screens width-first with internal category scrolling", (width, height) => {
    const canvasWidth = width;
    const canvasHeight = canvasWidth * 4333 / 2000;
    expect(canvasWidth).toBe(width);
    expect(canvasHeight / canvasWidth).toBeCloseTo(4333 / 2000, 8);
    expect(canvasHeight).toBeGreaterThan(height);
    const css = readFileSync("src/app/globals.css", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    expect(css).toContain(".category-page-viewport { position: relative;");
    expect(css).toContain("inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);");
    expect(css).toMatch(/\.category-page-final\s*\{[^}]*overflow:\s*hidden;[^}]*container:\s*category-stage \/ size;/);
    expect(css).toMatch(/\.category-page-scroll-region\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;[^}]*touch-action:\s*pan-y;/);
    expect(css).toMatch(/\.category-page-viewport\s*\{[^}]*width:\s*100cqw;[^}]*max-width:\s*100%;[^}]*aspect-ratio:\s*2000 \/ 4333;[^}]*overflow:\s*hidden;/);
    expect(css).toContain("touch-action: pan-y;");
    expect(css).toContain('html[data-h5-page-lock="category"]');
    expect(css).toContain("aspect-ratio: 2000 / 4333;");
    expect(css).toContain("container-type: inline-size;");
    expect(css).toContain('background-image: url("/design/final-v1/category-runtime/category-paper-base.runtime.webp")');
    expect(css).toContain("background-position: center top;");
    expect(css).toContain("background-size: auto min(216.65cqw,1624.875px);");
    expect(category).toContain('data-artwork-source="layered-components"');
    expect(category).toContain('data-category-layer={layer.id}');
    expect(category).not.toContain("-source.jpg");
    expect(category).not.toContain('"--category-page-background-image"');
    expect(category).toContain('root.setAttribute("data-h5-page-lock", "category")');
    expect(category).toContain("window.scrollTo(0, 0)");
    expect(category).toContain('className="category-page-scroll-region"');
    expect(category).toContain('className="category-page-viewport"');
  });

  it.each([
    [375, 812], [390, 844], [393, 797], [393, 852], [412, 892],
    [414, 896], [428, 926], [430, 932],
  ])("fits and locks the complete approved detail canvas at %ix%i", (width, height) => {
    const canvasWidth = Math.min(width, height * 2000 / 4333);
    const canvasHeight = canvasWidth * 4333 / 2000;
    expect(canvasWidth).toBeGreaterThanOrEqual(320);
    expect(canvasWidth).toBeLessThanOrEqual(width);
    expect(canvasHeight).toBeLessThanOrEqual(height + 1e-8);
    expect(canvasHeight / canvasWidth).toBeCloseTo(4333 / 2000, 8);

    const css = readFileSync("src/app/globals.css", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    expect(css).toContain("@container category-stage (min-width: 320px) and (min-height: 693.28px)");
    expect(css).toMatch(/@container category-stage[^}]+\.category-page-scroll-region\s*\{[^}]*overflow-y:\s*hidden;[^}]*touch-action:\s*pan-x;[\s\S]*}/);
    expect(css).toContain("width: min(100cqw,46.1574cqh);");
    expect(category).toContain("scrollHeight > scrollRegion.clientHeight + 1");
  });

  it("keeps report images in document scroll at 100% and isolates the zoomed pan surface", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.report-image-stage\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;[^}]*touch-action:\s*pan-y;/);
    expect(css).toMatch(/\.report-image-stage\.is-zoomed\s*\{[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*contain;[^}]*touch-action:\s*none;/);
  });

  it("keeps guide decoding and route priming separate from the global runtime loading buffer", () => {
    const experience = readFileSync("src/components/h5/GuideExperience.tsx", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const runtimeBuffer = readFileSync("src/components/h5/RuntimeLoadingBuffer.tsx", "utf8");
    const globalLoading = readFileSync("src/app/loading.tsx", "utf8");
    const reportsLayout = readFileSync("src/app/reports/layout.tsx", "utf8");
    const categoryLoading = readFileSync("src/app/reports/[slug]/loading.tsx", "utf8");
    const route = readFileSync("src/app/go/page.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(existsSync("public/design/guide/data-loading-buffer.gif")).toBe(false);
    expect(route).toContain("<GuideExperience/>");
    expect(experience).not.toContain('fetch("/api/public/content"');
    expect(experience).toContain('router.prefetch("/reports")');
    expect(experience).toContain("return <BrandGuide/>");
    expect(experience).not.toContain("AdaptiveReadinessGate");
    expect(experience).not.toContain("preloadHomepageAssets");
    expect(experience).not.toContain("homepageCriticalWarmRequests");
    expect(guide).toContain("markImageDecoded(event.currentTarget");
    expect(guide).toContain("requiredReadyKeys.every((required) => readyLayers.current.has(required))");
    expect(guide).toContain("void primeGuideRouteContinuity(layoutProfile, destinationStatus === \"fallback\")");
    expect(guide).toContain("const transitionGestureReady = gestureReady && destinationUsable && continuityReady;");
    expect(reports).not.toContain("reportsDeferredWarmRequests");
    expect(reports).not.toContain("categoryRouteWarmRequests");
    expect(reports).toContain('idleWindow.requestIdleCallback(prefetchCategoryRoutes, { timeout: 1500 })');
    expect(reports).not.toContain("getCategoryReadinessAssets(slug)");
    expect(reports).not.toContain("preloadHomepageAssets(requests)");
    expect(reports).toContain("if (!navigating.current) releaseHomepagePreloadedAssets();");
    expect(reports).toContain("setDeferredMounted(true);");
    expect(reports).toContain('settleSelector=".reports-archive-final"');
    expect(reports).toContain('data-deferred-artwork={deferredMounted ? "mounted" : "waiting"}');
    expect(runtimeBuffer).toContain('src="/design/guide/data-loading-buffer-poster.webp"');
    expect(runtimeBuffer).not.toContain("data-loading-buffer.gif");
    expect(runtimeBuffer).not.toContain("guide-loading-buffer-gif");
    expect(runtimeBuffer).toContain("const [suppressedByGuideContinuity] = useState");
    expect(runtimeBuffer).toContain('document.documentElement.hasAttribute("data-guide-route-entry")');
    expect(runtimeBuffer).toContain("if (suppressedByGuideContinuity) return null;");
    expect(globalLoading).toContain("<DeferredRuntimeLoadingBuffer");
    expect(reportsLayout).toContain('id="h5-category-route-loading-host"');
    expect(reportsLayout).toContain('aria-hidden="true"');
    expect(reportsLayout).toContain("<RuntimeLoadingBuffer persistent");
    expect(categoryLoading).toContain('<DeferredRuntimeLoadingBuffer label="正在打开档案分类"');
    expect(css).toContain(".runtime-loading-layer { position: fixed;");
    expect(css).toContain("z-index: 2147483600;");
    expect(css).toContain("#h5-category-route-buffer-host { position: fixed; z-index: 2147483640;");
    expect(css).toContain("html[data-category-route-buffer]:not([data-category-loading-feedback]) .runtime-loading-layer { visibility: hidden; }");
    expect(css).toContain("html[data-category-loading-feedback] .runtime-loading-layer { visibility: visible; z-index: 2147483646; }");
    expect(css).toContain(".guide-loading-buffer.is-leaving");
    expect(css).toMatch(/\.guide-loading-buffer-stage\s*\{[^}]*width:\s*min\([^;}]*var\(--h5-content-width\)\);[^}]*height:\s*100%;[^}]*aspect-ratio:\s*auto;/);
    expect(css).toMatch(/\.guide-loading-buffer-poster\s*\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/);
    expect(css).not.toContain("guide-loading-buffer-gif");
    expect(css).toContain(".guide-loading-buffer-poster { visibility: visible; }");
  });

  it("keeps decoded semantic layers ordered without the retired mask or MotionStage fallback", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const guide = readFileSync("src/components/h5/BrandGuide.tsx", "utf8");
    expect(css).toContain(".brand-guide-character { z-index: 20;");
    expect(css).toContain(".brand-guide-arch { z-index: 27;");
    expect(css).toContain(".brand-guide-foreground-top { z-index: 35;");
    expect(css).toContain(".brand-guide-paper { z-index: 34;");
    expect(css).not.toContain(".guide-compact-character");
    expect(css).not.toContain(".guide-compact-arch");
    expect(css).not.toContain(".guide-compact-character-overlay");
    expect(css).toContain(".brand-guide-window-mask");
    expect(guide).toContain("standardReadyKeys");
    expect(guide).not.toContain("compactReadyKeys");
    expect(guide).toContain("landscapeReadyKeys");
    expect(guide).toContain('"guide-static-foreground-v2.webp"');
    expect(guide).toContain('"guide-first-frame.webp"');
    expect(guide).toContain('setAssetStatus("failed")');
    expect(guide).not.toContain("MotionStage");
    expect(guide).not.toContain("loadingFallback");
    expect(guide).not.toContain("guide-final-fallback-v3.webp");
    expect(guide).toContain("brand-guide-window-mask");
    expect(css).not.toContain("brand-guide-paper-arm-occlusion");
    expect(css).not.toContain("brand-guide-paper-right-occlusion");
    expect(css).not.toContain("guide-right-arm-mask.webp");
    expect(css).toContain("@keyframes guide-paper-from-right { from { transform: translate3d(39%,-1.2%,0) rotate(3.4deg); } to { transform: translate3d(0,0,0) rotate(0); } }");
  });

  it("keeps category-to-report navigation continuously painted", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const category = readFileSync("src/components/h5/CategoryDetail.tsx", "utf8");
    const reportPage = readFileSync("src/app/reports/[slug]/items/[cardId]/reports/page.tsx", "utf8");
    const runtimeBuffer = readFileSync("src/components/h5/RuntimeLoadingBuffer.tsx", "utf8");

    expect(css).toContain(".category-page-final.h5-page-transition.is-leaving { opacity: 1; transform: none; animation: none; }");
    expect(category).toContain('leaving ? <RuntimeLoadingBuffer label="正在打开报告" reason="report-route"/> : null');
    expect(reportPage).toContain("report-page report-page-final ${theme.backgroundClass}");
    expect(reportPage).not.toContain("report-page-final h5-page-transition");
    expect(runtimeBuffer).toContain("routeLoadingRevealDelayMs = 0");
    expect(runtimeBuffer).toContain("useState(delayMs <= 0)");
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

  it("keeps the reference composite only as a decoded layered-artwork fallback", () => {
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const transitionVisual = readFileSync("src/components/h5/archive-entry-transition-visual.ts", "utf8");
    expect(reports).toContain("ArchiveArtwork, archiveArtworkCriticalAssets");
    expect(reports).not.toContain("archiveArtworkDeferredAssets");
    expect(reports).toContain("const [deepDeferredMounted, setDeepDeferredMounted] = useState(preview);");
    expect(reports).toContain("<ArchiveArtwork preview={preview} mountDeferred={preview || deferredMounted} mountDeepDeferred={preview || deepDeferredMounted} />");
    expect(reports).toContain('data-archive-artwork-ready={artworkComplete ? "true" : "false"}');
    expect(reports).toContain('data-archive-artwork-failed={artworkFailed ? "true" : "false"}');
    expect(reports).toContain('className="reports-archive-reference-fallback"');
    expect(reports).toContain('src="/design/final-v1/archive-reference-public.webp"');
    expect(artwork).toContain('data-artwork-source="layered-originals"');
    expect(artwork).toContain('const archiveOutputRoot = "/design/final-v1/长图输出"');
    expect(artwork).toContain('moduleTwoAsset("资源 10.png")');
    expect(artwork).toContain('moduleTwoAsset("资源 20.png")');
    expect(artwork).not.toContain("docs/input");
    expect(artwork).toContain('const archiveRuntimeRoot = "/design/final-v1/archive/runtime-layers"');
    expect(artwork).toContain("archiveEntryBatchLayers.map(entryLayer)");
    expect(transitionVisual).toContain('layer("module-1-passed-copy", 63, 1821, 628, 113, 40)');
    expect(existsSync("public/design/final-v1/archive/runtime-layers/module-1-passed-copy.runtime.webp")).toBe(true);
    expect(artwork).toContain("module-3-output.webp");
    expect(artwork).toContain('top: 4374.5, width: 1000, height: 1182.5, unoptimized: true');
    expect(artwork).toContain('loading="eager"');
    expect(artwork).toContain('fetchPriority={layer.eager ? "high" : "low"}');
    expect(artwork).toContain("archiveArtworkCriticalAssets");
    expect(artwork).toContain("archiveArtworkDeferredAssets");
    expect(artwork).toContain("const deepDeferredParts = new Set([");
    expect(artwork).toContain("mountDeepDeferred = true");
    expect(artwork).toContain("(mountDeepDeferred && deepDeferredParts.has(layer.id))");
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

  it("keeps the archive unlock ribbon on a single tight compositor layer", () => {
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const component = readFileSync("src/components/h5/motion/modules/ArchiveUnlockTabMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    const clipRule = css.match(/\.archive-unlock-tab-clip\s*\{([^}]*)\}/)?.[1] ?? "";
    const movingRule = css.match(/\.archive-unlock-tab-clip\.is-moving\s*\{([^}]*)\}/)?.[1] ?? "";
    const imageRule = css.match(/\.archive-unlock-tab-image\s*\{([^}]*)\}/)?.[1] ?? "";
    const percent = (rule: string, property: string) => Number(rule.match(new RegExp(`${property}:\\s*([\\d.]+)%`))?.[1]);

    expect(artwork).not.toContain('moduleOneLayer("module-1-swipe"');
    expect(artwork).toContain("<ArchiveUnlockTabMotion preview={preview} />");
    expect(artwork).toContain('id === "module-1-folder-back"');
    expect(artwork).toContain('id === "module-1-folder-front"');
    expect(component).toContain("accumulated.current / h5MotionTiming.archiveUnlockTab.revealDistancePx");
    expect(component).toContain("data-unlock-progress");
    expect(component).not.toContain("sessionStorage");
    expect(component).toContain("/design/final-v1/archive-unlock-ribbon.webp");
    expect(component).toContain("width={193}");
    expect(component).toContain("height={674}");
    expect(component).not.toContain("h5长图-下滑条.png");
    expect(component).not.toContain("MotionStage");
    expect(component).not.toContain("setProgress");
    expect(component).toContain("--archive-unlock-hidden-bottom");
    expect(css).toContain("z-index: 20");
    expect(percent(clipRule, "left")).toBeCloseTo(83.35, 6);
    expect(percent(clipRule, "top")).toBeCloseTo(32.6974986504, 6);
    expect(percent(clipRule, "width")).toBeCloseTo(9.65, 6);
    expect(percent(clipRule, "height")).toBeCloseTo(6.06442324996, 6);
    expect(imageRule).toContain("inset: 0");
    expect(imageRule).toContain("width: 100%");
    expect(imageRule).toContain("height: 100%");
    expect(movingRule).toContain("clip-path: inset(0 0 var(--archive-unlock-hidden-bottom) 0)");
    expect(css).not.toContain("--archive-unlock-reveal-top");
    expect(css).not.toContain("left: -40.6%");
    expect(css).not.toContain("width: 151.7%");
    expect(css).not.toContain(".archive-unlock-tab-motion > .motion-stage");
  });

  it("replaces the retired decoration and sequences the three supplied title posters with compositor bounce motion", () => {
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const artwork = readFileSync("src/components/h5/ArchiveArtwork.tsx", "utf8");
    const component = readFileSync("src/components/h5/motion/modules/ArchiveSectionTitleMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(reports).toContain('import { ArchiveSectionTitleMotion } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion"');
    expect(reports).not.toContain("archiveSectionTitleWarmAssets");
    expect(reports).toContain("<ArchiveSectionTitleMotion preview={preview} activeSlug={pressedSlug} />");
    expect(component).not.toContain("archive-module-exit-layer");
    expect(component).not.toContain("exitingSlug");
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
    expect(css).toContain(".archive-section-click-cue-gif { z-index: 0; animation: archive-click-cue-attention");
    expect(css).toContain("@keyframes archive-click-cue-attention");
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
});
