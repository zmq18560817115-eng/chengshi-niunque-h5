import { render, screen } from "@testing-library/react";
import ReportPage from "@/app/reports/[slug]/items/[cardId]/reports/page";

const mocks = vi.hoisted(() => ({
  getCardSnapshot: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  router: { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => mocks.router,
}));

vi.mock("@/server/services/public-content-service", () => ({
  PublicContentService: class {
    getCardSnapshot(slug: string, cardId: string) {
      return mocks.getCardSnapshot(slug, cardId);
    }
  },
}));

const imageAsset = {
  id: "image-report",
  title: "图片检测报告",
  description: null,
  type: "IMAGE" as const,
  href: "/reports/image/image-report",
  openMode: "same_tab" as const,
  pages: [{ id: "image-page", pageNumber: 1, href: "/reports/image/page/image-page" }],
};

const cardSnapshot = (assets: Array<Record<string, unknown>>) => ({
  version: "version-1",
  result: {
    module: { id: "inspection", slug: "inspection-projects", title: "检测项目", description: null, cards: [] },
    card: { id: "nutrition", title: "核心营养含量", description: null, buttonText: "查看报告", footerNote: null, assets },
  },
});

describe("public report page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not found for every reserved public placeholder card id before reading content", async () => {
    for (const cardId of ["placeholder-slot-3", "placeholder-slot-arbitrary"]) {
      await expect(ReportPage({ params: Promise.resolve({ slug: "inspection-projects", cardId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(mocks.getCardSnapshot).not.toHaveBeenCalled();
  });

  it("renders image reports only and never exposes legacy PDF or external links", async () => {
    mocks.getCardSnapshot.mockResolvedValue(cardSnapshot([
      imageAsset,
      { id: "legacy-pdf", title: "历史 PDF", description: null, type: "PDF", href: "/reports/pdf/legacy-pdf", openMode: "same_tab", pages: [] },
      { id: "legacy-link", title: "历史外链", description: null, type: "EXTERNAL_LINK", href: "https://example.com/report", openMode: "new_tab", pages: [] },
    ]));
    render(await ReportPage({ params: Promise.resolve({ slug: "inspection-projects", cardId: "nutrition" }) }));

    expect(screen.getByRole("img", { name: "图片检测报告 第 1 页" })).toBeInTheDocument();
    expect(screen.queryByText("历史 PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("历史外链")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /打开外部资料|查看原 PDF/ })).not.toBeInTheDocument();
  });

  it("shows a neutral empty state instead of test reports when no image is published", async () => {
    mocks.getCardSnapshot.mockResolvedValue(cardSnapshot([]));
    render(await ReportPage({ params: Promise.resolve({ slug: "inspection-projects", cardId: "nutrition" }) }));

    expect(screen.getByRole("status")).toHaveTextContent("暂无已发布图片报告");
    expect(screen.queryByText(/测试报告占位/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
