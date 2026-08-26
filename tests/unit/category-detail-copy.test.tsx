import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CategoryDetail } from "@/components/h5/CategoryDetail";
import { preloadHomepageAssets } from "@/components/h5/homepage-preload";
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
    document.documentElement.removeAttribute("data-category-route-entry");
    document.documentElement.removeAttribute("data-category-route-buffer");
  });

  it("renders card copy as HTML sourced from public content", () => {
    const { container } = render(<CategoryDetail module={moduleFixture} preview />);

    expect(screen.getByText("核心营养含量")).toBeInTheDocument();
    expect(screen.getByText("DHA、ARA与安全检测说明。")).toBeInTheDocument();
    expect(screen.getAllByText("查看2份报告")).not.toHaveLength(0);
    const passedStatuses = container.querySelectorAll(
      '.category-card-status[data-status="已通过"]',
    );
    expect(passedStatuses).toHaveLength(2);
    expect(
      [...passedStatuses].every((status) =>
        status.querySelector(".category-card-status-text-art"),
      ),
    ).toBe(true);
    expect(container.querySelector('[data-category-layer="folder"]')).toHaveAttribute("src", expect.stringContaining("category-runtime/inspection-folder-layer.png"));
    expect(container.querySelectorAll(".category-page-artwork-layer")).toHaveLength(6);
    expect(container.querySelector(".category-page-viewport")).toHaveAttribute("data-artwork-source", "layered-components");
    expect(container.innerHTML).not.toContain("inspection-source.jpg");
    expect(container.querySelectorAll(".category-card-backplate")).toHaveLength(3);
    expect(container.querySelector('.category-card-backplate[data-index="0"]')).toHaveAttribute("src", expect.stringContaining("category-runtime/inspection-card-1.png"));
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
    window.addEventListener("h5-category-route-ready", onReady);
    document.documentElement.setAttribute("data-category-route-entry", moduleFixture.slug);
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    expect(container.querySelector(".category-page-final")).toHaveAttribute("data-route-entry", "reports-archive");
    expect(onReady).not.toHaveBeenCalled();
    expect(document.documentElement).not.toHaveAttribute("data-category-route-entry");
    await act(async () => { resolveReadiness({ total: categoryReadinessAssets["inspection-projects"].length, failed: [] }); });
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    window.removeEventListener("h5-category-route-ready", onReady);
  });

  it("uses the buffered entry marker immediately when archive continuity is active", () => {
    document.documentElement.setAttribute("data-category-route-entry", moduleFixture.slug);
    document.documentElement.setAttribute("data-category-route-buffer", "active");
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    expect(container.querySelector(".category-page-final")).toHaveAttribute("data-route-entry", "reports-archive-buffer");
  });

  it("keeps direct category loads on their existing transition", async () => {
    const { container } = render(<CategoryDetail module={moduleFixture} />);
    await act(async () => { await Promise.resolve(); });

    expect(container.querySelector(".category-page-final")).not.toHaveAttribute("data-route-entry");
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

  it("renders production status with original fish and design-text artwork instead of system text", () => {
    const { container } = render(<CategoryDetail module={traceabilityModuleFixture} preview />);
    const statusLabels = [...container.querySelectorAll<HTMLElement>(".category-card-status")];

    expect(statusLabels).toHaveLength(2);
    expect(statusLabels.map((label) => label.textContent)).toEqual(["", ""]);
    expect(statusLabels.map((label) => label.dataset.status)).toEqual(["已核验", "已核对"]);
    expect(statusLabels.map((label) => label.querySelectorAll("img").length)).toEqual([2, 2]);
    expect(statusLabels.every((label) => label.querySelector(".category-card-status-art")?.getAttribute("src")?.startsWith("/design/final-v1/"))).toBe(true);
    expect(statusLabels.every((label) => label.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(statusLabels.every((label) => label.closest(".category-card-hotspot"))).toBe(true);
  });

  it("preloads the complete category asset set, hides the visual back pill, and navigates immediately", async () => {
    const { container } = render(<CategoryDetail module={moduleFixture} />);

    await waitFor(() => expect(preloadHomepageAssets).toHaveBeenCalled());
    expect(vi.mocked(preloadHomepageAssets).mock.calls[0]?.[0]).toEqual(
      categoryReadinessAssets["inspection-projects"].map((src) => ({ src, priority: "high" })),
    );
    expect(screen.queryByRole("button", { name: "返回上一页" })).not.toBeInTheDocument();

    const firstCard = container.querySelector<HTMLButtonElement>('.category-card-hotspot[data-index="0"]');
    expect(firstCard).not.toBeNull();
    fireEvent.click(firstCard!);
    expect(navigation.push).toHaveBeenCalledWith("/reports/inspection-projects/items/nutrition/reports");
  });
});
