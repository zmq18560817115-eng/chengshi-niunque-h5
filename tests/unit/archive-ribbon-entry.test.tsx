import { act, fireEvent, render } from "@testing-library/react";
import { ArchiveUnlockTabMotion } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { h5MotionTiming } from "@/components/h5/motion/motion-config";

let observers: { notify: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
const intersect = () => act(() => observers.at(-1)!.notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
const load = (container: HTMLElement) => act(() => fireEvent.load(container.querySelector("img")!));

describe("archive ribbon entry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal("IntersectionObserver", class {
      disconnect = vi.fn();
      constructor(notify: IntersectionObserverCallback) { observers.push({ notify, disconnect: this.disconnect }); }
      observe() {}
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("waits for image loading and the page handoff before starting on visibility", () => {
    const view = render(<ArchiveUnlockTabMotion active={false}/>);
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "hidden");
    load(view.container);
    expect(observers).toHaveLength(0);
    view.rerender(<ArchiveUnlockTabMotion active/>);
    expect(observers).toHaveLength(1);
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "hidden");
    intersect();
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "entering");
    expect(observers[0].disconnect).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(h5MotionTiming.archiveUnlockTab.enterDurationMs + 50));
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
    view.rerender(<ArchiveUnlockTabMotion active={false}/>);
    view.rerender(<ArchiveUnlockTabMotion active/>);
    expect(observers).toHaveLength(1);
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
  });

  it("does not start before the ribbon image loads", () => {
    const view = render(<ArchiveUnlockTabMotion/>);
    expect(observers).toHaveLength(0);
    load(view.container);
    expect(observers).toHaveLength(1);
  });

  it("shows the static original for previews, disabled motion, and unsupported browsers", () => {
    expect(render(<ArchiveUnlockTabMotion preview/>).container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
    expect(render(<ArchiveUnlockTabMotion enabled={false}/>).container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
    vi.stubGlobal("IntersectionObserver", undefined);
    expect(render(<ArchiveUnlockTabMotion/>).container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
    expect(observers).toHaveLength(0);
  });

  it("settles immediately when the user switches to reduced motion", () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    const view = render(<ArchiveUnlockTabMotion/>);
    load(view.container);
    intersect();
    media.matches = true;
    act(() => media.addEventListener.mock.calls[0][1]());
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
    act(() => vi.advanceTimersByTime(2000));
    expect(view.container.firstChild).toHaveAttribute("data-unlock-state", "fixed");
  });
});
