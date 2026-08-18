import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MotionBoundary } from "@/components/h5/motion/MotionBoundary";
import { MotionStage } from "@/components/h5/motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "@/components/h5/motion/motion-config";

function BrokenMotion(): never { throw new Error("motion failed"); }

describe("H5 motion isolation", () => {
  it("enables validated motion modules by default while preserving runtime switches", () => {
    expect(H5_MOTION_ENABLED).toBe(true);
    expect(h5MotionModules).toEqual({
      guide: true,
      archiveLatestCircle: true,
      archiveUnlockTab: true,
      archiveResultColor: true,
      archiveStoryCopy: true,
      archiveFishFloat: true,
      categoryEnter: true,
      reportImageLoad: true,
    });
    render(<MotionStage enabled={false} masterWidth={750} masterHeight={1625} fallback={<p>静态原图</p>}><p>动画层</p></MotionStage>);
    expect(screen.getByText("静态原图")).toBeInTheDocument();
    expect(screen.queryByText("动画层")).not.toBeInTheDocument();
  });

  it("contains an animation exception without removing the page fallback", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<MotionBoundary fallback={<p>稳定页面</p>}><BrokenMotion/></MotionBoundary>);
    await waitFor(() => expect(screen.getByText("稳定页面")).toBeInTheDocument());
    error.mockRestore();
  });

  it("does not create a dynamic stage when animation is disabled", () => {
    const { container } = render(<MotionStage enabled={false} masterWidth={750} masterHeight={1625} fallback={<div data-testid="fallback"/>}><div/></MotionStage>);
    expect(container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("does not force the guide fallback visible after the dynamic stage is ready", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain(".motion-stage .brand-guide-fallback");
    expect(css).toContain(".motion-stage-fallback .brand-guide-fallback");
  });

  it("keeps archive motion visible long enough to be perceived", () => {
    expect(h5MotionTiming.archiveLatestCircle.delayMs).toBeGreaterThanOrEqual(200);
    expect(h5MotionTiming.archiveLatestCircle.delayMs).toBeLessThanOrEqual(300);
    expect(h5MotionTiming.archiveLatestCircle.durationMs).toBeGreaterThanOrEqual(700);
    expect(h5MotionTiming.archiveLatestCircle.durationMs).toBeLessThanOrEqual(900);
    expect(h5MotionTiming.archiveUnlockTab.durationMs).toBe(650);
    expect(h5MotionTiming.archiveResultColor.delayAfterCircleMs).toBeGreaterThanOrEqual(150);
    expect(h5MotionTiming.archiveResultColor.delayAfterCircleMs).toBeLessThanOrEqual(250);
    expect(h5MotionTiming.archiveResultColor.durationMs).toBeGreaterThanOrEqual(600);
    expect(h5MotionTiming.archiveResultColor.durationMs).toBeLessThanOrEqual(800);
    expect(h5MotionTiming.archiveStoryCopy.lineDurationMs).toBeGreaterThanOrEqual(450);
    expect(h5MotionTiming.archiveStoryCopy.lineStepMs).toBeGreaterThanOrEqual(450);
  });

  it("draws the archive circle along an SVG stroke instead of a rectangular reveal", () => {
    const component = readFileSync("src/components/h5/motion/modules/ArchiveLatestCircle.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(component).toContain("archive-latest-circle-stroke");
    expect(component).toContain("circleStrokePath");
    expect(css).toContain("stroke-dashoffset");
    expect(css).not.toContain("@keyframes archive-latest-circle-draw");
  });

  it("crossfades aligned normal and passed result canvases after the circle completes", () => {
    const component = readFileSync("src/components/h5/motion/modules/ArchiveResultColorMotion.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(component).toContain("archive-result-normal-canvas.webp");
    expect(component).toContain("archive-result-passed-canvas.webp");
    expect(component).toContain("archiveLatestCircle.durationMs");
    expect(css).toContain("@keyframes archive-result-normal-out");
    expect(css).toContain("@keyframes archive-result-passed-in");
  });
});
