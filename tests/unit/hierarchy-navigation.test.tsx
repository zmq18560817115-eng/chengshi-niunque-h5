import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  getHierarchyParentHref,
  h5CategoryScrollHistoryStateKey,
  h5HierarchyHistoryStateKey,
  pushHierarchyRoute,
  readCategoryScrollPosition,
  replaceHierarchyRoute,
  returnToHierarchyParent,
  saveCategoryScrollPosition,
  syncHierarchyHistoryEntry,
} from "@/components/h5/hierarchy-navigation";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

function commitClientRoute(href: string) {
  window.history.pushState({ nextInternal: true }, "", href);
  syncHierarchyHistoryEntry(href);
}

describe("fixed H5 hierarchy navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/go");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps every child route to its fixed product parent", () => {
    expect(getHierarchyParentHref("/go")).toBeNull();
    expect(getHierarchyParentHref("/reports")).toBeNull();
    expect(getHierarchyParentHref("/reports/inspection-projects")).toBe("/reports");
    expect(getHierarchyParentHref("/reports/inspection-projects/items/nutrition/reports?from=test")).toBe("/reports/inspection-projects");
  });

  it("replaces only the one-way guide entry", () => {
    replaceHierarchyRoute(navigation, "/reports");
    expect(navigation.replace).toHaveBeenCalledWith("/reports");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it("pushes archive and report children and annotates their verified parents", () => {
    window.history.replaceState({ parentInternal: true }, "", "/reports");
    pushHierarchyRoute(navigation, "/reports/inspection-projects");
    expect(navigation.push).toHaveBeenLastCalledWith("/reports/inspection-projects");
    commitClientRoute("/reports/inspection-projects");
    expect(window.history.state).toMatchObject({
      nextInternal: true,
      [h5HierarchyHistoryStateKey]: {
        version: 1,
        href: "/reports/inspection-projects",
        parentHref: "/reports",
      },
    });

    pushHierarchyRoute(navigation, "/reports/inspection-projects/items/nutrition/reports");
    expect(navigation.push).toHaveBeenLastCalledWith("/reports/inspection-projects/items/nutrition/reports");
    commitClientRoute("/reports/inspection-projects/items/nutrition/reports");
    expect(window.history.state[h5HierarchyHistoryStateKey]).toEqual({
      version: 1,
      href: "/reports/inspection-projects/items/nutrition/reports",
      parentHref: "/reports/inspection-projects",
    });
  });

  it("keeps category scroll on the category history entry without consuming it", () => {
    window.history.replaceState({ nextInternal: true }, "", "/reports/inspection-projects");

    saveCategoryScrollPosition("inspection-projects", 86);

    expect(window.history.state).toMatchObject({
      nextInternal: true,
      [h5CategoryScrollHistoryStateKey]: {
        version: 1,
        slug: "inspection-projects",
        scrollTop: 86,
      },
    });
    expect(readCategoryScrollPosition("inspection-projects")).toBe(86);
    expect(readCategoryScrollPosition("review-assurance")).toBe(0);
  });

  it("backs only when the current history entry explicitly names the fixed parent", () => {
    window.history.replaceState({}, "", "/reports/inspection-projects");
    pushHierarchyRoute(navigation, "/reports/inspection-projects/items/nutrition/reports");
    commitClientRoute("/reports/inspection-projects/items/nutrition/reports");

    returnToHierarchyParent(navigation, "/reports/inspection-projects");

    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("replaces a direct deep link with its fixed parent instead of trusting unrelated history", () => {
    const reportHref = "/reports/inspection-projects/items/nutrition/reports";
    window.history.replaceState({ unrelated: true }, "", reportHref);
    syncHierarchyHistoryEntry(reportHref);

    returnToHierarchyParent(navigation, "/reports/review-assurance");

    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith("/reports/inspection-projects");
  });

  it("right-swipes a verified report entry with back without showing a button", () => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/reports/inspection-projects");
    pushHierarchyRoute(navigation, "/reports/inspection-projects/items/nutrition/reports");
    commitClientRoute("/reports/inspection-projects/items/nutrition/reports");
    vi.clearAllMocks();
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports/inspection-projects" showBackControl={false}><p>报告内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");

    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    act(() => vi.advanceTimersByTime(220));

    expect(screen.queryByRole("button", { name: "返回上一页" })).not.toBeInTheDocument();
    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("right-swipes a direct report entry by replacing it with the canonical parent", () => {
    vi.useFakeTimers();
    const reportHref = "/reports/inspection-projects/items/nutrition/reports";
    window.history.replaceState({}, "", reportHref);
    syncHierarchyHistoryEntry(reportHref);
    render(<SwipeBackPage className="h5-page-transition" fallbackHref="/reports/inspection-projects" showBackControl={false}><p>报告内容</p></SwipeBackPage>);
    const page = screen.getByRole("main");

    fireEvent.touchStart(page, { touches: [{ clientX: 20, clientY: 200 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 206 }] });
    act(() => vi.advanceTimersByTime(220));

    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith("/reports/inspection-projects");
  });
});
