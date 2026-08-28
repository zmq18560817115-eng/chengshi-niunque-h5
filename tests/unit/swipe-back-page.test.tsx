import { act, fireEvent, render, screen } from "@testing-library/react";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("SwipeBackPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it("uses replace for the visible hierarchical back action", () => {
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><p>内容</p></SwipeBackPage>);
    fireEvent.click(screen.getByRole("button", { name: "返回上一页" }));
    act(() => vi.advanceTimersByTime(220));
    expect(navigation.replace).toHaveBeenCalledWith("/reports");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("accepts a deliberate right swipe only when it starts at the left edge", () => {
    const { container } = render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><p>内容</p></SwipeBackPage>);
    const page = container.querySelector("main")!;

    fireEvent.touchStart(page, { touches: [{ clientX: 44, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 144, clientY: 204 }] });
    expect(page).not.toHaveClass("is-swipe-back");

    fireEvent.touchStart(page, { touches: [{ clientX: 18, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 112, clientY: 204 }] });
    expect(page).toHaveClass("is-swipe-back");
    act(() => vi.advanceTimersByTime(220));
    expect(navigation.replace).toHaveBeenCalledWith("/reports");
  });

  it("ignores gestures that start on controls or inside a report viewer", () => {
    const { container } = render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports">
      <button type="button">图片操作</button>
      <div className="report-image-stage">报告图片</div>
    </SwipeBackPage>);
    const page = container.querySelector("main")!;
    const control = screen.getByRole("button", { name: "图片操作" });
    const viewer = screen.getByText("报告图片");

    fireEvent.touchStart(control, { touches: [{ clientX: 12, clientY: 200 }] });
    fireEvent.touchEnd(control, { changedTouches: [{ clientX: 112, clientY: 202 }] });
    fireEvent.touchStart(viewer, { touches: [{ clientX: 12, clientY: 260 }] });
    fireEvent.touchEnd(viewer, { changedTouches: [{ clientX: 112, clientY: 262 }] });

    expect(page).not.toHaveClass("is-swipe-back");
    act(() => vi.advanceTimersByTime(220));
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("uses the safe-area content edge as the swipe origin", () => {
    const { container } = render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports"><p>内容</p></SwipeBackPage>);
    const page = container.querySelector("main")!;
    vi.spyOn(page, "getBoundingClientRect").mockReturnValue({
      x: 44, y: 0, left: 44, top: 0, right: 419, bottom: 812,
      width: 375, height: 812, toJSON: () => ({}),
    });

    fireEvent.touchStart(page, { touches: [{ clientX: 50, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 146, clientY: 202 }] });

    expect(page).toHaveClass("is-swipe-back");
    act(() => vi.advanceTimersByTime(220));
    expect(navigation.replace).toHaveBeenCalledWith("/reports");
  });
});
