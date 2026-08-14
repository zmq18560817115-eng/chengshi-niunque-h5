import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ArchiveStoryCopyMotion } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";

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
    act(() => notify?.([{ isIntersecting: true, intersectionRatio: .3 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(root).toHaveAttribute("data-motion-started", "false");
    await act(async () => pending.forEach(({ resolve }) => resolve()));
    await waitFor(() => expect(root).toHaveAttribute("data-motion-ready", "true"));
    fireEvent.wheel(window);
    act(() => notify?.([{ isIntersecting: true, intersectionRatio: .3 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(root).toHaveAttribute("data-motion-started", "true");
    expect(disconnect).toHaveBeenCalled();
    await waitFor(() => expect(root).toHaveAttribute("data-motion-complete", "true"), { timeout: 8000 });
    expect(sessionStorage.getItem("archive-story-copy-complete-v2")).toBe("true");
  }, 9000);

  it("uses the complete static artwork for reduced motion and asset failure", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const reduced = render(<ArchiveStoryCopyMotion/>);
    await waitFor(() => expect(reduced.container.querySelector(".archive-story-copy")).toHaveAttribute("data-motion-complete", "true"));
    expect(reduced.container.querySelector(".motion-stage")).not.toBeInTheDocument();
    expect(reduced.container.querySelectorAll(".archive-story-copy-line.is-static")).toHaveLength(4);
  });
});
