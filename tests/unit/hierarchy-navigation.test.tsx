import { act, fireEvent, render, screen } from "@testing-library/react";
import { replaceHierarchyRoute, type H5HierarchyHref } from "@/components/h5/hierarchy-navigation";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("fixed H5 hierarchy navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replaces every forward level so the hierarchy never grows visit history", () => {
    const entries = ["/outside", "/go"];
    let index = entries.length - 1;
    const router = {
      replace: vi.fn((href: string) => { entries[index] = href; }),
      push: vi.fn((href: string) => { entries.splice(++index, entries.length, href); }),
    };
    const forward: H5HierarchyHref[] = [
      "/reports",
      "/reports/inspection-projects",
      "/reports/inspection-projects/items/nutrition/reports",
    ];

    forward.forEach((href) => replaceHierarchyRoute(router, href));

    expect(entries).toEqual(["/outside", forward.at(-1)]);
    expect(router.replace).toHaveBeenCalledTimes(3);
    expect(router.push).not.toHaveBeenCalled();
    index -= 1;
    expect(entries[index]).toBe("/outside");
  });

  it("right-swipes to the fixed parent with replace so Back cannot reopen the report", () => {
    vi.useFakeTimers();
    const reportHref = "/reports/inspection-projects/items/nutrition/reports";
    const entries = ["/outside", reportHref];
    let index = entries.length - 1;
    navigation.replace.mockImplementation((href: string) => { entries[index] = href; });
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports/inspection-projects" showBackControl={false}><p>报告内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");

    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    act(() => vi.advanceTimersByTime(220));

    expect(navigation.replace).toHaveBeenCalledWith("/reports/inspection-projects");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
    index -= 1;
    expect(entries[index]).toBe("/outside");
    expect(entries).not.toContain(reportHref);
  });
});
