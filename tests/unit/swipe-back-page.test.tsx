import { act, fireEvent, render, screen } from "@testing-library/react";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ ...navigation, prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

describe("SwipeBackPage hierarchy navigation", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.replace.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("replaces the current report route with its declared parent", () => {
    render(<SwipeBackPage className="report-page" fallbackHref="/reports/inspection-projects" backLabel="返回检测项目">报告内容</SwipeBackPage>);

    fireEvent.click(screen.getByRole("button", { name: "返回检测项目" }));
    act(() => vi.advanceTimersByTime(220));

    expect(navigation.replace).toHaveBeenCalledWith("/reports/inspection-projects");
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
