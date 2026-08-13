import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";

describe("ImageReportViewer", () => {
  const asset = { id: "asset-1", title: "营养检测报告", description: "报告说明", type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const };

  it("keeps natural height, supports 1–3x zoom and retries an isolated failure", async () => {
    const { container } = render(<ImageReportViewer asset={asset}/>);
    expect(container.querySelector(".report-image-stage")).toHaveClass("is-loading");
    fireEvent.load(screen.getByRole("img"));
    await waitFor(() => expect(container.querySelector(".report-image-stage")).toHaveClass("is-loaded"));
    fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "125%" });
    for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByRole("button", { name: "放大报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "300%" });
    expect(screen.getByRole("button", { name: "放大报告图片" })).toBeDisabled();
    for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByRole("button", { name: "缩小报告图片" }));
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("button", { name: "缩小报告图片" })).toBeDisabled();
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
    fireEvent.doubleClick(container.querySelector(".report-image-stage") as HTMLElement);
    expect(screen.getByRole("img")).toHaveStyle({ width: "100%" });
    const stage = container.querySelector(".report-image-stage") as HTMLElement;
    fireEvent.touchStart(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 200, clientY: 0 }] });
    expect(screen.getByRole("img")).toHaveStyle({ width: "200%" });
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toHaveTextContent("营养检测报告资料加载失败");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
