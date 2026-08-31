import { PublicContentService, reportButtonText } from "@/server/services/public-content-service";
import type { PublicContentRepository } from "@/server/repositories/public-content-repository";
import { validateAssetInput } from "@/server/validation/admin-content";

describe("multi-page report content linkage", () => {
  it("treats several image pages as one report and derives the card count from published reports", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const repository = {
      listSettings: vi.fn().mockResolvedValue([]),
      listModules: vi.fn().mockResolvedValue([{ id: "module-1", slug: "review", title: "复核保障", description: null, updatedAt, cards: [{ id: "card-1", title: "配方与标签", description: "内容", footerNote: null, updatedAt, assets: [
        { id: "report-1", title: "检测报告", description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, updatedAt, pages: [
          { id: "page-1", pageNumber: 1, updatedAt },
          { id: "page-2", pageNumber: 2, updatedAt },
          { id: "page-3", pageNumber: 3, updatedAt },
        ] },
        { id: "report-2", title: "复核记录", description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, updatedAt, pages: [{ id: "page-4", pageNumber: 1, updatedAt }] },
      ] }] }]),
    } as unknown as PublicContentRepository;

    const content = await new PublicContentService(repository).getContent();
    const card = content.modules[0]?.cards[0];
    expect(card?.buttonText).toBe("查看2份报告");
    expect(card?.assets).toHaveLength(2);
    expect(card?.assets[0]?.pages).toEqual([
      { id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" },
      { id: "page-2", pageNumber: 2, href: "/reports/image/page/page-2" },
      { id: "page-3", pageNumber: 3, href: "/reports/image/page/page-3" },
    ]);
    expect(reportButtonText(0)).toBe("暂无报告");
  });

  it("validates uploaded image pages as one ordered report", () => {
    const report = validateAssetInput({
      reportCardId: "card-1",
      title: "成分检测报告",
      assetType: "IMAGE",
      openMode: "SAME_TAB",
      sortOrder: 10,
      status: "PUBLISHED",
      pages: [
        { storageKey: "reports/2026/a.png", mimeType: "image/png", byteSize: 120 },
        { storageKey: "reports/2026/b.webp", mimeType: "image/webp", byteSize: 240 },
      ],
    });

    expect(report.pages).toEqual([
      { storageKey: "reports/2026/a.png", mimeType: "image/png", byteSize: BigInt(120), pageNumber: 1 },
      { storageKey: "reports/2026/b.webp", mimeType: "image/webp", byteSize: BigInt(240), pageNumber: 2 },
    ]);
    expect(() => validateAssetInput({ ...report, pages: [{ storageKey: "../bad.png", mimeType: "image/png" }] })).toThrow(/存储路径无效/);
  });

  it("changes the public version when an older published report is removed", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const records = (assetIds: string[]) => [{ id: "module", slug: "review", title: "复核", description: null, updatedAt, cards: [{ id: "card", title: "卡片", description: null, footerNote: null, updatedAt, assets: assetIds.map((id) => ({ id, title: id, description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, updatedAt, pages: [] })) }] }];
    const listModules = vi.fn().mockResolvedValue(records(["older-report", "newer-report"]));
    const repository = { listModules, listSettings: vi.fn().mockResolvedValue([]) } as unknown as PublicContentRepository;
    const service = new PublicContentService(repository);
    const initial = await service.getContent();
    listModules.mockResolvedValue(records(["newer-report"]));
    const removed = await service.getContent();
    expect(removed.version).not.toBe(initial.version);
    expect(removed.modules[0]?.cards[0]?.buttonText).toBe("查看1份报告");
  });

  it("does not publish PDF or external navigation targets to the H5", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const repository = {
      listSettings: vi.fn().mockResolvedValue([]),
      listModules: vi.fn().mockResolvedValue([{ id: "module", slug: "review", title: "复核", description: null, updatedAt, cards: [{ id: "card", title: "资料", description: null, footerNote: null, updatedAt, assets: [
        { id: "pdf", title: "PDF", description: null, assetType: "PDF", openMode: "SAME_TAB", externalUrl: null, updatedAt, pages: [] },
        { id: "external", title: "外链", description: null, assetType: "EXTERNAL_LINK", openMode: "NEW_TAB", externalUrl: "https://example.com/report", updatedAt, pages: [] },
      ] }] }]),
    } as unknown as PublicContentRepository;

    const assets = (await new PublicContentService(repository).getContent()).modules[0]?.cards[0]?.assets;
    expect(assets?.map((asset) => asset.href)).toEqual(["", ""]);
  });
});
