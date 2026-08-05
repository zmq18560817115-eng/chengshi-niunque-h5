import { fireEvent, render, screen } from "@testing-library/react";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { ImageReportViewer } from "@/components/h5/ImageReportViewer";

describe("multi-page H5 interactions", () => {
  afterEach(() => vi.useRealTimers());

  it("auto-enters after three seconds and prevents duplicate transitions", () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<BrandGuide onEnter={onEnter} />);
    fireEvent.click(screen.getByRole("button", { name: "进入档案" }));
    fireEvent.click(screen.getByRole("button", { name: "进入档案" }));
    vi.advanceTimersByTime(4000);
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("allows an upward swipe to enter early", () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<BrandGuide onEnter={onEnter} />);
    const page = screen.getByRole("main");
    fireEvent.touchStart(page, { touches: [{ clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientY: 220 }] });
    vi.advanceTimersByTime(300);
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("supports report zoom, fullscreen, error and retry", () => {
    const asset = { id: "asset-1", title: "营养检测报告", description: null, type: "IMAGE" as const, href: "/reports/image/asset-1", openMode: "same_tab" as const };
    render(<ImageReportViewer asset={asset} />);
    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(screen.getByRole("img")).toHaveStyle({ transform: "scale(1.25)" });
    fireEvent.click(screen.getByRole("button", { name: "全屏" }));
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toHaveTextContent("加载失败");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
