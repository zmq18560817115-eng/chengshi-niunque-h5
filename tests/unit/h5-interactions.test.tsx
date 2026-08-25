import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";
import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { h5MotionTiming } from "@/components/h5/motion/motion-config";

type PendingImage = { src: string; resolve: () => void; reject: () => void };
let pendingImages: PendingImage[] = [];

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
        resolve: () => { this.onload?.(); resolve(); },
        reject: () => { this.onerror?.(); reject(); },
      });
    });
  }
}

describe("multi-page H5 interactions", () => {
  beforeEach(() => {
    pendingImages = [];
    sessionStorage.clear();
    vi.stubGlobal("Image", PreloadImageMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    expect(links.map((link) => link.style.top)).toEqual(["48.4%", "58.2%", "62%"]);
    expect(links.map((link) => link.style.left)).toEqual(["43%", "4%", "43%"]);
    expect(links.every((link) => link.style.transform === "")).toBe(true);
  });

  it("assembles the archive from original layers and preserves navigation hotspots", () => {
    const modules = [{ id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] }];
    const { container } = render(<ReportsArchive modules={modules}/>);
    const artwork = container.querySelector("[data-artwork-source='layered-originals']");
    expect(artwork).toHaveClass("reports-archive-art", "reports-archive-source-art");
    expect(container.querySelector('[src*="archive-reference.webp"]')).not.toBeInTheDocument();
    expect(container.querySelectorAll(".reports-archive-source-layer").length).toBeGreaterThan(0);
    expect(container.querySelector(".archive-module-one")).not.toBeInTheDocument();
    expect(container.querySelector('[data-slug="inspection-projects"]')).toBeInTheDocument();
  });

  it("does not render the retired module-two static title resources", () => {
    const { container } = render(<ReportsArchive modules={[]}/>);
    const sourceParts = [...container.querySelectorAll<HTMLElement>("[data-source-part]")]
      .map((layer) => layer.dataset.sourcePart);
    expect(sourceParts).toEqual(expect.arrayContaining(["module-2-resource-10", "module-2-resource-20"]));
    expect(sourceParts).not.toContain("module-1-swipe");
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

  it("wires the supplied fish GIFs, story reveal, and three GIF title groups over the archive artwork", () => {
    const { container } = render(<ReportsArchive modules={[]}/>);
    expect(container.querySelector("[data-motion-module='archiveStoryCopy']")).toBeInTheDocument();
    expect(container.querySelectorAll(".archive-story-copy-line")).toHaveLength(4);
    expect(container.querySelector("[data-motion-module='archiveFishFloat']")).toBeInTheDocument();
    expect(container.querySelector("[data-motion-module='archiveSectionTitle']")).toBeInTheDocument();
    expect([...container.querySelectorAll<HTMLElement>(".archive-section-title-group")].map((group) => group.dataset.titleGroup)).toEqual([
      "inspection-projects",
      "review-assurance",
      "production-traceability",
    ]);
    expect(container.querySelector(".archive-section-title-gif")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-unlock-tab-motion")).toBeInTheDocument();
    expect(container.querySelector(".archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "idle");
  });

  it("keeps the approved archive artwork stable for reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { container } = render(<ReportsArchive modules={[]}/>);
    expect(pendingImages).toHaveLength(0);
    expect(container.querySelector(".archive-fish-float")).toBeInTheDocument();
    expect(container.querySelector(".archive-fish-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-fish-motion-gif")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".archive-section-title-group")).toHaveLength(3);
    expect(container.querySelector(".archive-section-title-gif")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-section-title-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-story-copy-clean-patch")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-result-color")).not.toBeInTheDocument();
    expect(container.querySelector(".archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "fallback");
  });

  it("stays on the guide after five seconds and only enters once from the hint action", () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<BrandGuide onEnter={onEnter} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(onEnter).not.toHaveBeenCalled();
    const action = screen.getByRole("button", { name: "进入档案" });
    fireEvent.click(action);
    fireEvent.click(action);
    act(() => vi.advanceTimersByTime(460));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("enters on a deliberate upward swipe after guide assets are ready", async () => {
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    const stage = container.querySelector(".brand-guide-stage");
    await act(async () => pendingImages.forEach(({ resolve }) => resolve()));
    await waitFor(() => expect(page).toHaveClass("is-ready", "is-motion-enabled"));
    expect(stage).toHaveAttribute("data-swipe-state", "locked");
    expect(screen.getByRole("button", { name: "进入档案" })).toBeDisabled();
    fireEvent.touchStart(page, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 196, clientY: 220 }] });
    expect(onEnter).not.toHaveBeenCalled();
    await waitFor(() => expect(stage).toHaveAttribute("data-swipe-state", "ready"), { timeout: 3000 });
    expect(screen.getByRole("button", { name: "进入档案" })).toBeEnabled();
    fireEvent.touchStart(page, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 196, clientY: 220 }] });
    await waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
  });

  it.each([
    ["downward", { x: 200, y: 220 }, { x: 196, y: 300 }],
    ["rightward", { x: 180, y: 260 }, { x: 250, y: 255 }],
    ["leftward", { x: 260, y: 300 }, { x: 190, y: 310 }],
    ["short upward", { x: 200, y: 260 }, { x: 196, y: 215 }],
    ["mostly horizontal diagonal", { x: 260, y: 320 }, { x: 165, y: 255 }],
  ])("does not enter after a %s gesture", async (_label, start, end) => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    fireEvent.touchStart(page, { touches: [{ clientX: start.x, clientY: start.y }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: end.x, clientY: end.y }] });
    act(() => vi.advanceTimersByTime(500));
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("uses a deliberate right swipe for back navigation without drawing a back button", () => {
    vi.useFakeTimers();
    const { container } = render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><p>资料内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");
    expect(container.querySelector("a, button")).not.toBeInTheDocument();
    fireEvent.touchStart(page, { touches: [{ clientX: 30, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 80, clientY: 205 }] });
    expect(page).not.toHaveClass("is-swipe-back");
    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    expect(page).toHaveClass("is-swipe-back");
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
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onEnter = vi.fn();
    const { container } = render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    expect(container.querySelectorAll(".brand-guide-paper")).toHaveLength(4);
    expect(container.querySelector(".brand-guide-paper-arm-occlusion")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-paper-right-occlusion")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".brand-guide-window-mask")).toHaveLength(2);
    const animatedCanvas = container.querySelector(".is-animated-canvas");
    const windowMask = animatedCanvas?.querySelector(".brand-guide-window-mask");
    const windowFrame = animatedCanvas?.querySelector(".brand-guide-arch");
    expect(windowMask).toBeInTheDocument();
    expect(windowFrame).toBeInTheDocument();
    expect(windowMask!.compareDocumentPosition(windowFrame!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(container.querySelector(".motion-stage.is-loading .is-initial-canvas")).toBeInTheDocument();
    expect(container.querySelector(".motion-stage-fallback .brand-guide-character-open")?.getAttribute("src")).toContain("guide-character-open.webp");
    expect(container.querySelector(".motion-stage-fallback .brand-guide-window-mask")?.getAttribute("src")).toContain("guide-window-mask.webp");
    expect(container.querySelector(".motion-stage-fallback .brand-guide-arch")?.getAttribute("src")).toContain("guide-arch.webp");
    expect(container.querySelector(".motion-stage-fallback .brand-guide-foreground-top")?.getAttribute("src")).toContain("guide-foreground-top.webp");
    expect(container.querySelector(".motion-stage-fallback .brand-guide-paper")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-first-frame")).not.toBeInTheDocument();
    expect(container.querySelector(".is-animated-canvas .brand-guide-final-frame")).not.toBeInTheDocument();
    expect(container.querySelector(".is-animated-canvas .brand-guide-initial-frame")).not.toBeInTheDocument();
    expect(container.querySelector(".is-animated-canvas .brand-guide-base")?.getAttribute("src")).toContain("guide-background.webp");
    expect(container.querySelector(".motion-stage.is-loading .brand-guide-fallback")).not.toBeInTheDocument();
    await act(async () => pendingImages.forEach(({ resolve }) => resolve()));
    await waitFor(() => expect(page).toHaveClass("is-ready"));
    expect(container.querySelector(".motion-stage.is-ready .is-initial-canvas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入档案" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "进入档案" })).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "进入档案" }));
    await waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
    consoleError.mockRestore();
  });

  it("switches from the complete layered first frame to the final fallback when a critical guide asset fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(<BrandGuide/>);
    const loadingWindowMask = container.querySelector(".motion-stage-fallback .brand-guide-window-mask");
    expect(loadingWindowMask).toBeInTheDocument();
    fireEvent.error(loadingWindowMask as Element);
    await act(async () => pendingImages.forEach(({ reject }) => reject()));
    await waitFor(() => expect(container.querySelector(".brand-guide")).toHaveClass("is-failed"));
    expect(container.querySelector(".brand-guide-first-frame")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-fallback")?.getAttribute("src")).toContain("guide-final-fallback-v3.webp");
    expect(container.querySelector(".brand-guide")).not.toHaveClass("has-no-fallback");
    consoleError.mockRestore();
  });

  it("keeps the final static fallback when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { container } = render(<BrandGuide />);
    const page = screen.getByRole("main");
    await waitFor(() => expect(page).toHaveClass("is-reduced"));
    expect(pendingImages).toHaveLength(0);
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-load-state", "reduced");
    expect(container.querySelector(".brand-guide-stage")).toHaveAttribute("data-animation-state", "paused");
    expect(container.querySelector(".brand-guide-dynamic-stage")).not.toBeInTheDocument();
    expect(container.querySelector(".brand-guide-fallback")).toBeInTheDocument();
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
