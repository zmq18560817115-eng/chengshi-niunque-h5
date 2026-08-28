import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";

describe("ImageReportViewer", () => {
  const asset = { id: "asset-1", title: "营养检测报告", description: "报告说明", type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const, pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }, { id: "page-2", pageNumber: 2, href: "/reports/image/page/page-2" }] };

  it("keeps zoom inside a fixed viewer, supports 1–4x zoom, page switching and isolated retry", async () => {
    const { container } = render(<ImageReportViewer asset={asset}/>);
    const viewer = container.querySelector(".image-report") as HTMLElement;
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    expect(stage).toHaveClass("is-loading");
    expect(stage.getAttribute("aria-label")).toContain("单指上下滑动可继续浏览页面");
    fireEvent.load(screen.getByRole("img"));
    await waitFor(() => expect(stage).toHaveClass("is-loaded"));
    expect(stage).not.toHaveClass("is-zoomed");
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "125%" });
    expect(stage).toHaveClass("is-zoomed");
    for (let index = 0; index < 11; index += 1) fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "400%" });
    expect(screen.getByRole("button", { name: "放大报告图片" })).toBeDisabled();
    for (let index = 0; index < 12; index += 1) fireEvent.click(screen.getByRole("button", { name: "缩小报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("button", { name: "缩小报告图片" })).toBeDisabled();
    expect(stage).not.toHaveClass("is-zoomed");
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    fireEvent.touchStart(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 200, clientY: 0 }] });
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
    expect(screen.getByRole("alert")).toHaveTextContent("营养检测报告 · 第 2 页资料加载失败");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("lets the page own one-finger scrolling at 100% and isolates viewer gestures after zoom", () => {
    const parentTouchStart = vi.fn();
    const parentTouchMove = vi.fn();
    const { container } = render(<div onTouchStart={parentTouchStart} onTouchMove={parentTouchMove}><ImageReportViewer asset={asset}/></div>);
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    fireEvent.load(screen.getByRole("img"));

    fireEvent.touchStart(stage, { touches: [{ clientX: 120, clientY: 300 }] });
    const pageScrollAllowed = fireEvent.touchMove(stage, { touches: [{ clientX: 120, clientY: 220 }] });
    expect(pageScrollAllowed).toBe(true);
    expect(parentTouchStart).not.toHaveBeenCalled();
    expect(parentTouchMove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    Object.defineProperty(stage, "scrollLeft", { configurable: true, writable: true, value: 80 });
    Object.defineProperty(stage, "scrollTop", { configurable: true, writable: true, value: 80 });
    fireEvent.touchStart(stage, { touches: [{ clientX: 120, clientY: 300 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 70, clientY: 240 }] });
    expect(stage).toHaveClass("is-zoomed");
    expect(stage.scrollLeft).toBe(130);
    expect(stage.scrollTop).toBe(140);
    expect(parentTouchStart).not.toHaveBeenCalled();
    expect(parentTouchMove).not.toHaveBeenCalled();
  });

  it("uses the currently visible part of a long report as the first button-zoom focal point", async () => {
    const { container } = render(<ImageReportViewer asset={asset}/>);
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    fireEvent.load(screen.getByRole("img"));
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      x: 0, y: -800, left: 0, top: -800, right: 390, bottom: 2400,
      width: 390, height: 3200, toJSON: () => ({}),
    });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
    Object.defineProperty(stage, "scrollTop", { configurable: true, writable: true, value: 0 });

    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));

    await waitFor(() => expect(stage.scrollTop).toBeGreaterThan(1000));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 400);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });
});
