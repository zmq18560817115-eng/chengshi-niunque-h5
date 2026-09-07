import { act, fireEvent, render } from "@testing-library/react";
import { ArchiveFolderPaperMotion } from "@/components/h5/motion/modules/ArchiveFolderPaperMotion";
import { guideArchiveEntryTiming } from "@/components/h5/guide-route-transition";

let observers: { notify: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
const paper = (id: string, ready = true, preview = false) => <ArchiveFolderPaperMotion id={id} ready={ready} preview={preview} style={{ top: "40%" }}><span>Original paper</span></ArchiveFolderPaperMotion>;
const intersect = (index: number) => act(() => observers[index].notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
const scrollDown = () => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
  fireEvent.scroll(window);
};

describe("archive folder paper entry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    observers = [];
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal("IntersectionObserver", class {
      disconnect = vi.fn();
      constructor(notify: IntersectionObserverCallback) { observers.push({ notify, disconnect: this.disconnect }); }
      observe() {}
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("reveals the two original papers independently only after scrolling into their regions", () => {
    const { container } = render(<>{paper("inspection")}{paper("production")}</>);
    const first = container.querySelector('[data-paper-id="inspection"]');
    const second = container.querySelector('[data-paper-id="production"]');
    intersect(0);
    expect(first).toHaveAttribute("data-paper-state", "hidden");
    scrollDown();
    expect(first).toHaveAttribute("data-paper-state", "entering");
    expect(second).toHaveAttribute("data-paper-state", "hidden");
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(guideArchiveEntryTiming.batchDurationMs + 50));
    expect(first).toHaveAttribute("data-paper-state", "complete");
    intersect(1);
    expect(second).toHaveAttribute("data-paper-state", "entering");
    expect(first).toHaveAttribute("data-paper-state", "complete");
  });

  it("waits for the decoded archive before observing a paper", () => {
    const { container, rerender } = render(paper("inspection", false));
    scrollDown();
    expect(observers).toHaveLength(0);
    expect(container.firstChild).toHaveAttribute("data-paper-state", "hidden");
    rerender(paper("inspection", true));
    intersect(0);
    expect(container.firstChild).toHaveAttribute("data-paper-state", "entering");
  });

  it("keeps a revealed paper in its final position after navigating back", () => {
    const view = render(paper("inspection"));
    scrollDown();
    intersect(0);
    view.unmount();
    const returned = render(paper("inspection"));
    expect(returned.container.firstChild).toHaveAttribute("data-paper-state", "complete");
    expect(observers).toHaveLength(1);
  });

  it("shows the static original in previews, reduced motion, and unsupported browsers", () => {
    const preview = render(paper("preview", true, true));
    expect(preview.container.firstChild).toHaveAttribute("data-paper-state", "complete");
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const reduced = render(paper("reduced"));
    expect(reduced.container.firstChild).toHaveAttribute("data-paper-state", "complete");
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const unsupported = render(paper("unsupported"));
    expect(unsupported.container.firstChild).toHaveAttribute("data-paper-state", "complete");
    expect(observers).toHaveLength(0);
  });
});
