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

  it("covers the viewport with every guide layer on the same undistorted canvas", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("overflow: hidden; align-items: center;");
    expect(css).toContain(".brand-guide-stage { position: relative; isolation: isolate; width: 100%; height: 100%;");
    expect(css).toContain("object-fit: cover; object-position: center;");
    expect(css).toContain(".brand-guide-base { z-index: 10; }");
    expect(css).toContain(".brand-guide-paper { z-index: 34;");
    expect(css).toContain(".brand-guide-window-mask { z-index: 25;");
    expect(css).toContain('background: #f8e89d url("/design/guide/guide-background.webp") center / cover no-repeat');
    expect(css).not.toContain("guide-initial-frame-out");
    expect(css).not.toContain("guide-final-frame-in");
  });

  it("anchors the static upward-swipe hint at the lower center", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("--guide-entry-hint-width: min(52.6vw, 24.65rem);");
    expect(css).toContain("--guide-entry-hint-bottom: max(2.7dvh, env(safe-area-inset-bottom));");
    expect(css).toContain(".brand-guide-entry-hint { position: absolute; z-index: 40; left: 50%; bottom: var(--guide-entry-hint-bottom);");
    expect(css).not.toContain("guide-hint-float");
  });

  it.each([
    [320, 568], [360, 640], [375, 667], [375, 812], [390, 844],
    [393, 852], [414, 896], [430, 932], [768, 1024], [766, 1472],
  ])("scales the guide proportionally to cover a %ix%i phone viewport", (width, height) => {
    const masterRatio = 750 / 1625;
    const stageWidth = Math.max(width, height * masterRatio);
    const stageHeight = stageWidth / masterRatio;
    expect(stageWidth).toBeGreaterThanOrEqual(width);
    expect(stageHeight).toBeGreaterThanOrEqual(height - Number.EPSILON);
    expect(stageWidth / stageHeight).toBeCloseTo(masterRatio, 8);
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

  it("moves the guide and archive upward while fading between pages", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(".brand-guide.is-leaving { opacity: 0; transform: translate3d(0,-12dvh,0);");
    expect(css).toContain("animation: reports-slide-up-fade var(--h5-route-transition-duration) var(--h5-route-transition-easing) both;");
    expect(css).toContain("@keyframes reports-slide-up-fade { from { opacity: 0; transform: translate3d(0,12dvh,0); } to { opacity: 1; transform: translate3d(0,0,0); } }");
    expect(css).not.toContain("translate3d(100%,0,0)");
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
    expect(reports).toContain('import { ArchiveArtwork } from "@/components/h5/ArchiveArtwork";');
    expect(reports).toContain("<ArchiveArtwork preview={preview} />");
    expect(reports).not.toContain("archive-reference.webp");
    expect(artwork).toContain('data-artwork-source="layered-originals"');
    expect(artwork).toContain('const archiveOutputRoot = "/design/final-v1/长图输出"');
    expect(artwork).toContain('moduleTwoAsset("资源 10.png")');
    expect(artwork).toContain('moduleTwoAsset("资源 20.png")');
    expect(artwork).not.toContain("docs/input");
    expect(artwork).toContain("/design/final-v1/长图输出/完整长图-共三个模块_04.jpg");
    expect(artwork).toContain('top: 4374.5, width: 1000, height: 1182.5, unoptimized: true');
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

  it("replaces the three baked folder titles with the supplied viewport-scoped GIFs", () => {
    const reports = readFileSync("src/components/h5/ReportsArchive.tsx", "utf8");
    const component = readFileSync("src/components/h5/motion/modules/ArchiveSectionTitleMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(reports).toContain('import { ArchiveSectionTitleMotion } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";');
    expect(reports).toContain("<ArchiveSectionTitleMotion preview={preview} />");
    expect(component).toContain("/design/final-v1/检测项目_逐字跳动.gif");
    expect(component).toContain("/design/final-v1/复核保障_逐字跳动.gif");
    expect(component).toContain("/design/final-v1/生产溯源_逐字跳动.gif");
    expect(component).not.toContain("title-clean-");
    expect(component).not.toContain("cleanPatch");
    expect(component).toContain("left: 486");
    expect(component).toContain("left: 25");
    expect(component).toContain("left: 472");
    expect(component).toContain("top: 2788");
    expect(component).toContain("top: 3165");
    expect(component).toContain("top: 3522.5");
    expect(component).toContain("height: `${group.height / masterHeight * 100}%`");
    expect(component).not.toContain("aspectRatio:");
    expect(component).toContain('rootMargin: "45% 0px"');
    expect(component).toContain("h5MotionModules.archiveSectionTitle");
    expect(component).toContain("IntersectionObserver");
    expect(component).toContain("ready && visible");
    expect(css).not.toContain("archive-section-title-clean-patch");
    expect(css).toContain(".archive-section-title-gif { z-index: 0; }");
    expect(css).not.toContain("archive-section-title-hop");
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
