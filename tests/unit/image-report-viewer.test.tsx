import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";

describe("ImageReportViewer", () => {
  const asset = { id: "asset-1", title: "营养检测报告", description: "报告说明", type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const, pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }, { id: "page-2", pageNumber: 2, href: "/reports/image/page/page-2" }] };

  it("keeps zoom inside a fixed viewer, supports 1–4x zoom, page switching and isolated retry", async () => {
    const { container } = render(<ImageReportViewer asset={asset}/>);
    const viewer = container.querySelector(".image-report") as HTMLElement;
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    expect(stage).toHaveClass("is-loading");
    expect(stage.getAttribute("aria-label")).toContain("区域内反复缩放");
    fireEvent.load(screen.getByRole("img"));
    await waitFor(() => expect(stage).toHaveClass("is-loaded"));
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "125%" });
    for (let index = 0; index < 11; index += 1) fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "400%" });
    expect(screen.getByRole("button", { name: "放大报告图片" })).toBeDisabled();
    for (let index = 0; index < 12; index += 1) fireEvent.click(screen.getByRole("button", { name: "缩小报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("button", { name: "缩小报告图片" })).toBeDisabled();
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    fireEvent.touchStart(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 200, clientY: 0 }] });
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
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
});
