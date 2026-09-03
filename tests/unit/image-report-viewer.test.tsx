import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
}));

describe("ImageReportViewer", () => {
  const asset = { id: "asset-1", title: "营养检测报告", description: "报告说明", type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const, pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }, { id: "page-2", pageNumber: 2, href: "/reports/image/page/page-2" }] };

  beforeEach(() => vi.clearAllMocks());

  it("keeps the currently visible reading anchor when entering zoom", () => {
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frames.push(callback); return frames.length; });
    const { container } = render(<ImageReportViewer asset={asset}/>);
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    Object.defineProperty(stage, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(stage, "clientHeight", { configurable: true, get: () => stage.classList.contains("is-zoomed") ? 552 : 2000 });
    vi.spyOn(stage, "getBoundingClientRect").mockImplementation(() => {
      const zoomed = stage.classList.contains("is-zoomed");
      const height = zoomed ? 552 : 2000;
      return { x: 0, y: 80, left: 0, top: 80, right: 320, bottom: 80 + height, width: 320, height, toJSON: () => ({}) };
    });

    const visibleScreenY = (80 + Math.min(2080, window.innerHeight)) / 2;
    const contentY = visibleScreenY - 80;
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(stage).toHaveClass("is-zoomed");
    expect(frames).toHaveLength(1);
    act(() => frames.shift()?.(0));
    const contentAtSameScreenPoint = (stage.scrollTop + visibleScreenY - 80) / 1.25;
    expect(contentAtSameScreenPoint).toBeCloseTo(contentY, 5);
    requestFrame.mockRestore();
  });

  it("uses page scrolling at 100%, then keeps zoom inside a fixed viewer with isolated recovery", async () => {
    const { container } = render(<ImageReportViewer asset={asset} returnHref="/reports/inspection-projects" returnLabel="返回检测项目"/>);
    const viewer = container.querySelector(".image-report") as HTMLElement;
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    expect(stage).toHaveClass("is-loading");
    expect(stage).toHaveClass("is-natural");
    expect(stage).not.toHaveAttribute("data-swipe-back-ignore");
    expect(stage.getAttribute("aria-label")).toContain("原始大小随页面滚动");
    Object.defineProperties(stage, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    });
    const dispatchMousePointer = (type: string, values: Record<string, string | number>) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.entries(values).forEach(([name, value]) => Object.defineProperty(event, name, { value }));
      fireEvent(stage, event);
    };

    dispatchMousePointer("pointerdown", { pointerType: "mouse", button: 0, pointerId: 1, clientX: 40, clientY: 40 });
    expect(stage).not.toHaveClass("is-dragging");
    stage.scrollTop = 12;
    fireEvent.touchStart(stage, { touches: [{ clientX: 40, clientY: 80 }] });
    expect(fireEvent.touchMove(stage, { touches: [{ clientX: 40, clientY: 40 }] })).toBe(true);
    expect(stage.scrollTop).toBe(12);

    fireEvent.load(screen.getByRole("img"));
    await waitFor(() => expect(stage).toHaveClass("is-loaded"));
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(stage).toHaveClass("is-zoomed");
    expect(stage.getAttribute("aria-label")).toContain("图片区域内平移");
    expect(stage).toHaveAttribute("data-swipe-back-ignore", "true");
    expect(screen.getByRole("img")).toHaveStyle({ width: "125%" });
    dispatchMousePointer("pointerdown", { pointerType: "mouse", button: 0, pointerId: 2, clientX: 40, clientY: 40 });
    expect(stage).toHaveClass("is-dragging");
    dispatchMousePointer("pointerup", { pointerType: "mouse", button: 0, pointerId: 2, clientX: 40, clientY: 40 });
    expect(stage).not.toHaveClass("is-dragging");

    Object.defineProperty(stage, "scrollHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(stage, "clientHeight", { configurable: true, get: () => 500 });
    let stageScrollTop = 0;
    Object.defineProperty(stage, "scrollTop", { configurable: true, get: () => stageScrollTop, set: (value: number) => { stageScrollTop = Math.min(500, Math.max(0, value)); } });
    stage.scrollTop = 500;
    const scrollTo = vi.mocked(window.scrollTo);
    scrollTo.mockClear();
    fireEvent.touchStart(stage, { touches: [{ clientX: 30, clientY: 200 }] });
    expect(fireEvent.touchMove(stage, { touches: [{ clientX: 30, clientY: 100 }] })).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(0, 100);
    fireEvent.touchEnd(stage, { touches: [] });

    stage.scrollLeft = 20;
    stage.scrollTop = 30;
    dispatchMousePointer("pointerdown", { pointerType: "mouse", button: 0, pointerId: 3, clientX: 100, clientY: 100 });
    expect(stage).toHaveClass("is-dragging");
    dispatchMousePointer("pointermove", { pointerType: "mouse", pointerId: 3, clientX: 80, clientY: 70 });
    expect(stage.scrollLeft).toBe(40);
    expect(stage.scrollTop).toBe(60);
    dispatchMousePointer("pointerup", { pointerType: "mouse", pointerId: 3, clientX: 80, clientY: 70 });
    expect(stage).not.toHaveClass("is-dragging");

    for (let index = 0; index < 11; index += 1) fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "400%" });
    expect(screen.getByRole("button", { name: "放大报告图片" })).toBeDisabled();
    for (let index = 0; index < 12; index += 1) fireEvent.click(screen.getByRole("button", { name: "缩小报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    expect(stage).toHaveClass("is-natural");
    expect(stage).not.toHaveAttribute("data-swipe-back-ignore");
    expect(screen.getByRole("button", { name: "缩小报告图片" })).toBeDisabled();
    fireEvent.doubleClick(stage);
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
    fireEvent.doubleClick(stage);
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    fireEvent.touchStart(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
    expect(fireEvent.touchMove(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 200, clientY: 0 }] })).toBe(true);
    await waitFor(() => expect(screen.getByRole("img")).toHaveStyle({ width: "200%" }));
    expect(stage).toHaveClass("is-pinching");
    fireEvent.touchEnd(stage, { touches: [] });
    expect(stage).not.toHaveClass("is-pinching");

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(viewer).toHaveAttribute("data-page", "2");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/reports/image/page/page-2");
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toHaveTextContent("营养检测报告 · 第 2 页报告图片暂时没有加载出来");
    expect(screen.getByRole("alert")).toHaveTextContent("诚实纽雀检测档案");
    fireEvent.click(screen.getByRole("button", { name: "返回检测项目" }));
    expect(navigation.replace).toHaveBeenCalledWith("/reports/inspection-projects");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
