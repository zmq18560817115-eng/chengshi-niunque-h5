import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ArchiveStoryCopyMotion } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { h5MotionTiming } from "@/components/h5/motion/motion-config";

vi.mock("@/components/h5/motion/motion-config", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/h5/motion/motion-config")>();
  return { ...original, h5MotionModules: { ...original.h5MotionModules, archiveStoryCopy: true } };
});

type PendingImage = { resolve: () => void; reject: () => void };
let pending: PendingImage[] = [];
let notify: IntersectionObserverCallback | undefined;
let disconnect: ReturnType<typeof vi.fn>;

class PreloadImageMock {
  decoding = "auto";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  decode() {
    return new Promise<void>((resolve, reject) => pending.push({ resolve: () => { this.onload?.(); resolve(); }, reject: () => { this.onerror?.(); reject(); } }));
  }
}

describe("archive story copy motion", () => {
  beforeEach(() => {
    pending = [];
    notify = undefined;
    disconnect = vi.fn();
    sessionStorage.clear();
    vi.stubGlobal("Image", PreloadImageMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
      takeRecords() { return []; }
      root = null;
      rootMargin = "0px";
      thresholds = [.3];
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("waits for assets and trusted manual scrolling before revealing four ordered lines once", async () => {
    const { container } = render(<ArchiveStoryCopyMotion/>);
    const root = container.querySelector(".archive-story-copy");
    expect(root).toHaveAttribute("data-motion-started", "false");
    expect(container.querySelectorAll("[data-story-line]")).toHaveLength(4);
    expect([...container.querySelectorAll("[data-story-line]")].map((line) => line.getAttribute("data-story-line"))).toEqual(["1", "2", "3", "4"]);
    expect([...container.querySelectorAll<HTMLElement>("[data-story-line]")].map((line) => line.style.getPropertyValue("--archive-story-line-offset"))).toEqual(
      h5MotionTiming.archiveStoryCopy.lineOffsetsMs.map((offset) => `${offset}ms`),
    );
    act(() => notify?.([{ isIntersecting: true, intersectionRatio: .3 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(root).toHaveAttribute("data-motion-started", "false");
    await act(async () => pending.forEach(({ resolve }) => resolve()));
    await waitFor(() => expect(root).toHaveAttribute("data-motion-ready", "true"));
    vi.useFakeTimers();
    fireEvent.wheel(window);
    act(() => notify?.([{ isIntersecting: true, intersectionRatio: .3 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(root).toHaveAttribute("data-motion-started", "true");
    expect(root).toHaveAttribute("data-motion-visible", "true");
    expect(disconnect).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    act(() => notify?.([{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(root).toHaveAttribute("data-motion-visible", "false");
    act(() => vi.advanceTimersByTime(10000));
    expect(root).toHaveAttribute("data-motion-complete", "false");
    act(() => notify?.([{ isIntersecting: true, intersectionRatio: .3 } as IntersectionObserverEntry], {} as IntersectionObserver));
    act(() => vi.advanceTimersByTime(6599));
    expect(root).toHaveAttribute("data-motion-complete", "false");
    act(() => vi.advanceTimersByTime(1));
    expect(root).toHaveAttribute("data-motion-complete", "true");
    expect(sessionStorage.getItem("archive-story-copy-complete-v3")).toBe("true");
  });

  it("leaves the baked static artwork unobscured for reduced motion and asset failure", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const reduced = render(<ArchiveStoryCopyMotion/>);
    await waitFor(() => expect(reduced.container.querySelector(".archive-story-copy")).toHaveAttribute("data-motion-complete", "true"));
    expect(reduced.container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(reduced.container.querySelectorAll(".archive-story-copy-line")).toHaveLength(0);
    reduced.unmount();

    pending = [];
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const failed = render(<ArchiveStoryCopyMotion/>);
    await act(async () => pending.forEach(({ reject }) => reject()));
    await waitFor(() => expect(failed.container.querySelector(".archive-story-copy")).toHaveAttribute("data-motion-complete", "true"));
    expect(failed.container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(failed.container.querySelector(".archive-story-copy-clean-patch")).not.toBeInTheDocument();
  });
});
