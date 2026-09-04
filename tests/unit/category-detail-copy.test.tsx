import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CategoryDetail } from "@/components/h5/CategoryDetail";
import { preloadHomepageAssets } from "@/components/h5/homepage-preload";
import { readCategoryScrollPosition, saveCategoryScrollPosition } from "@/components/h5/hierarchy-navigation";
import { categoryReadinessAssets } from "@/config/h5-category-themes";
import type { PublicModule } from "@/server/services/public-content-service";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

vi.mock("@/components/h5/homepage-preload", () => ({
  preloadHomepageAssets: vi.fn().mockResolvedValue({ total: 4, failed: [] }),
}));

const moduleFixture: PublicModule = {
  id: "inspection",
  slug: "inspection-projects",
  title: "检测项目",
  description: null,
  cards: [{
    id: "nutrition",
    title: "核心营养含量",
    description: "DHA、ARA与安全检测说明。",
    buttonText: "查看2份报告",
    footerNote: null,
    assets: [],
  }],
};

const traceabilityModuleFixture: PublicModule = {
  id: "traceability",
  slug: "production-traceability",
  title: "生产溯源",
  description: null,
  cards: [
    { id: "qualification", title: "生产资质", description: null, buttonText: "查看2份报告", footerNote: null, assets: [] },
    { id: "quality", title: "质量管理", description: null, buttonText: "查看3份报告", footerNote: null, assets: [] },
  ],
};

describe("CategoryDetail dynamic card copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(preloadHomepageAssets).mockResolvedValue({ total: 4, failed: [] });
    sessionStorage.clear();
    window.history.replaceState({}, "", "/reports/inspection-projects");
    document.documentElement.removeAttribute("data-category-route-entry");
    document.documentElement.removeAttribute("data-category-route-attempt");
    document.documentElement.removeAttribute("data-category-route-buffer");
    document.documentElement.removeAttribute("data-category-native-transition");
  });

  it("renders card copy as HTML sourced from public content", () => {
    const { container } = render(<CategoryDetail module={moduleFixture} preview />);

    expect(screen.getByText("核心营养含量")).toBeInTheDocument();
    expect(screen.getByText("DHA、ARA与安全检测说明。")).toBeInTheDocument();
    expect(screen.getAllByText("查看2份报告")).not.toHaveLength(0);
    expect(container.querySelectorAll("[data-status]")).toHaveLength(0);
    expect(container.querySelectorAll(".category-card-status-text-art")).toHaveLength(0);
    expect(container.querySelector('[data-category-layer="folder"]')).toHaveAttribute("src", expect.stringContaining("category-runtime/inspection-folder-layer.runtime.webp"));
    expect(container.querySelectorAll(".category-page-artwork-layer")).toHaveLength(6);
    expect(container.querySelector(".category-page-viewport")).toHaveAttribute("data-artwork-source", "layered-components");
    expect(container.innerHTML).not.toContain("inspection-source.jpg");
    expect(container.querySelectorAll(".category-card-backplate")).toHaveLength(3);
    expect(container.querySelector('.category-card-backplate[data-index="0"]')).toHaveAttribute("src", expect.stringContaining("category-runtime/inspection-card-1.runtime.webp"));
    expect(container.querySelector(".category-inspection-batch-bubble")).not.toBeInTheDocument();
    expect(container.querySelector(".category-page-final")).not.toHaveClass("h5-page-transition", "is-leaving");
  });

  it("uses artwork-matched fallback copy for empty slots", () => {
    render(<CategoryDetail module={moduleFixture} preview />);
    expect(screen.getByText("油脂新鲜度")).toBeInTheDocument();
    expect(screen.getByText("安全底线")).toBeInTheDocument();
  });

  it("marks the archive entry on the first layout frame and announces only after artwork readiness", async () => {
    let resolveReadiness!: (value: { total: number; failed: string[] }) => void;
    vi.mocked(preloadHomepageAssets).mockReturnValueOnce(new Promise((resolve) => { resolveReadiness = resolve; }));
    const onReady = vi.fn();
    const onMounted = vi.fn();
    window.addEventListener("h5-category-route-ready", onReady);
    window.addEventListener("h5-category-route-mounted", onMounted);
    document.documentElement.setAttribute("data-category-route-entry", moduleFixture.slug);
    document.documentElement.setAttribute("data-category-route-attempt", "test-entry");
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    expect(container.querySelector(".category-page-final")).toHaveAttribute("data-route-entry", "reports-archive");
    expect(onMounted).toHaveBeenCalledTimes(1);
    expect((onMounted.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ attemptId: "test-entry", slug: moduleFixture.slug });
    expect(onReady).not.toHaveBeenCalled();
    expect(document.documentElement).not.toHaveAttribute("data-category-route-entry");
    await act(async () => { resolveReadiness({ total: categoryReadinessAssets["inspection-projects"].length, failed: [] }); });
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect((onReady.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ attemptId: "test-entry", slug: moduleFixture.slug, status: "ready" });
    window.removeEventListener("h5-category-route-ready", onReady);
    window.removeEventListener("h5-category-route-mounted", onMounted);
  });

  it("uses the buffered entry marker immediately when archive continuity is active", () => {
    document.documentElement.setAttribute("data-category-route-entry", moduleFixture.slug);
    document.documentElement.setAttribute("data-category-route-attempt", "test-buffered-entry");
    document.documentElement.setAttribute("data-category-route-buffer", "active");
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    expect(container.querySelector(".category-page-final")).toHaveAttribute("data-route-entry", "reports-archive-buffer");
  });

  it("keeps a native category entry at its settled frame after the browser snapshot releases", () => {
    document.documentElement.setAttribute("data-category-route-entry", moduleFixture.slug);
    document.documentElement.setAttribute("data-category-route-attempt", "test-native-entry");
    document.documentElement.setAttribute("data-category-native-transition", "test-native-entry");
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    expect(container.querySelector(".category-page-final")).toHaveAttribute("data-route-entry", "reports-archive-native");
  });

  it("keeps direct category loads on their existing transition", async () => {
    const { container } = render(<CategoryDetail module={moduleFixture} />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector(".category-page-final")).not.toHaveAttribute("data-route-entry");
  });

  it("keeps the category node and saved reading position stable when readiness completes", async () => {
    let resolveReadiness!: (value: { total: number; failed: string[] }) => void;
    vi.mocked(preloadHomepageAssets).mockReturnValueOnce(new Promise((resolve) => { resolveReadiness = resolve; }));
    saveCategoryScrollPosition(moduleFixture.slug, 86);
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    const initialPage = container.querySelector<HTMLElement>(".category-page-final");
    expect(initialPage?.scrollTop).toBe(86);
    await act(async () => { resolveReadiness({ total: categoryReadinessAssets["inspection-projects"].length, failed: [] }); });

    await waitFor(() => expect(container.querySelector<HTMLElement>(".category-page-final")?.scrollTop).toBe(86));
    expect(container.querySelector<HTMLElement>(".category-page-final")).toBe(initialPage);
  });

  it("does not reset a fresh category after the user starts scrolling", () => {
    vi.useFakeTimers();
    vi.mocked(preloadHomepageAssets).mockReturnValueOnce(new Promise(() => undefined));
    const { container } = render(<CategoryDetail module={moduleFixture} />);
    const categoryPage = container.querySelector<HTMLElement>(".category-page-final");

    categoryPage!.scrollTop = 86;
    act(() => vi.advanceTimersByTime(120));

    expect(categoryPage?.scrollTop).toBe(86);
    vi.useRealTimers();
  });

  it("does not overwrite the saved reading position while the report route is committing", () => {
    vi.mocked(preloadHomepageAssets).mockReturnValueOnce(new Promise(() => undefined));
    const { container, unmount } = render(<CategoryDetail module={moduleFixture} />);
    const categoryPage = container.querySelector<HTMLElement>(".category-page-final");
    const firstCard = container.querySelector<HTMLButtonElement>('.category-card-hotspot[data-index="0"]');
    expect(categoryPage).not.toBeNull();
    expect(firstCard).not.toBeNull();

    categoryPage!.scrollTop = 86;
    fireEvent.click(firstCard!);
    expect(readCategoryScrollPosition(moduleFixture.slug)).toBe(86);
    categoryPage!.scrollTop = 0;
    unmount();

    expect(readCategoryScrollPosition(moduleFixture.slug)).toBe(86);
  });

  it("maps card and copy coordinates directly from the shared 1000px master", () => {
    const { container } = render(<CategoryDetail module={moduleFixture} preview />);
    const firstCard = container.querySelector<HTMLElement>('.category-card-hotspot[data-index="0"]');

    expect(firstCard?.style.getPropertyValue("--category-card-x")).toBe("60");
    expect(firstCard?.style.getPropertyValue("--category-card-y")).toBe("526.5");
    expect(firstCard?.style.getPropertyValue("--category-copy-x")).toBe("65");
    expect(firstCard?.style.getPropertyValue("--category-copy-y")).toBe("80");
    expect(firstCard?.style.getPropertyValue("--category-copy-width")).toBe("742");
  });

  it("replaces legacy seed placeholders while preserving explicit managed copy", () => {
    const legacyModule = {
      ...moduleFixture,
      cards: [{ ...moduleFixture.cards[0], title: "第1项资料", description: "资料整理中，正式发布后可在此查看。", buttonText: "查看报告" }],
    };
    render(<CategoryDetail module={legacyModule} preview />);
    expect(screen.getByText("核心营养含量")).toBeInTheDocument();
    expect(screen.getAllByText("查看2份报告")).not.toHaveLength(0);
    expect(screen.queryByText("第1项资料")).not.toBeInTheDocument();
  });

  it("retains the production fish decoration without publishing a fixed conclusion", () => {
    const { container } = render(<CategoryDetail module={traceabilityModuleFixture} preview />);
    const decorations = [...container.querySelectorAll<HTMLElement>(".category-card-decoration")];

    expect(decorations).toHaveLength(2);
    expect(decorations.map((decoration) => decoration.textContent)).toEqual(["", ""]);
    expect(decorations.every((decoration) => decoration.dataset.status === undefined)).toBe(true);
    expect(decorations.map((decoration) => decoration.querySelectorAll("img").length)).toEqual([1, 1]);
    expect(decorations.every((decoration) => decoration.querySelector(".category-card-status-art")?.getAttribute("src")?.startsWith("/design/final-v1/category-runtime/"))).toBe(true);
    expect(decorations.every((decoration) => decoration.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(decorations.every((decoration) => decoration.closest(".category-card-hotspot"))).toBe(true);
    expect(container.querySelector(".category-card-status-text-art")).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("已核验");
    expect(container.innerHTML).not.toContain("已核对");
  });

  it("preloads the complete category asset set, hides the visual back pill, and navigates immediately", async () => {
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    await waitFor(() => expect(preloadHomepageAssets).toHaveBeenCalled());
    expect(vi.mocked(preloadHomepageAssets).mock.calls[0]?.[0]).toEqual(
      categoryReadinessAssets["inspection-projects"].map((src) => ({ src, priority: "high" })),
    );
    expect(screen.queryByRole("button", { name: "返回档案首页" })).not.toBeInTheDocument();

    const firstCard = container.querySelector<HTMLButtonElement>('.category-card-hotspot[data-index="0"]');
    const categoryPage = container.querySelector<HTMLElement>(".category-page-final");
    expect(firstCard).not.toBeNull();
    expect(categoryPage).not.toBeNull();
    if (categoryPage) categoryPage.scrollTop = 86;
    fireEvent.click(firstCard!);
    expect(categoryPage).toHaveClass("is-leaving");
    expect(readCategoryScrollPosition("inspection-projects")).toBe(86);
    expect(navigation.push).toHaveBeenCalledWith("/reports/inspection-projects/items/nutrition/reports");
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
