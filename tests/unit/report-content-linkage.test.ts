import { PublicContentService, reportButtonText } from "@/server/services/public-content-service";
import type { PublicContentRepository } from "@/server/repositories/public-content-repository";
import { validateAssetInput } from "@/server/validation/admin-content";

describe("multi-page report content linkage", () => {
  it("treats several image pages as one report and derives the card count from published reports", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const repository = {
      listSettings: vi.fn().mockResolvedValue([]),
      listModules: vi.fn().mockResolvedValue([{ id: "module-1", slug: "review", title: "复核保障", description: null, updatedAt, cards: [{ id: "card-1", title: "配方与标签", description: "内容", footerNote: null, updatedAt, assets: [
        { id: "report-1", title: "检测报告", description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, storageKey: "reports/1.png", mimeType: "image/png", updatedAt, pages: [
          { id: "page-1", pageNumber: 1, storageKey: "reports/1-1.png", mimeType: "image/png", updatedAt },
          { id: "page-2", pageNumber: 2, storageKey: "reports/1-2.png", mimeType: "image/png", updatedAt },
          { id: "page-3", pageNumber: 3, storageKey: "reports/1-3.png", mimeType: "image/png", updatedAt },
        ] },
        { id: "report-2", title: "复核记录", description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, storageKey: "reports/2.webp", mimeType: "image/webp", updatedAt, pages: [{ id: "page-4", pageNumber: 1, storageKey: "reports/2-1.webp", mimeType: "image/webp", updatedAt }] },
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
    expect(() => validateAssetInput({ ...report, pages: [{ storageKey: "reports/animated.gif", mimeType: "image/gif", byteSize: 120 }] })).toThrow(/JPG、PNG 或 WebP/);
    expect(() => validateAssetInput({ ...report, pages: [], storageKey: "reports/spoofed.jpg", mimeType: "image/png" })).toThrow(/MIME 类型与扩展名/);
    expect(() => validateAssetInput({ ...report, assetType: "PDF", pages: [], storageKey: "reports/report.pdf", mimeType: "application/pdf" })).toThrow(/静态图片/);
  });

  it("changes the public version when an older published report is removed", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const records = (assetIds: string[]) => [{ id: "module", slug: "review", title: "复核", description: null, updatedAt, cards: [{ id: "card", title: "卡片", description: null, footerNote: null, updatedAt, assets: assetIds.map((id) => ({ id, title: id, description: null, assetType: "IMAGE", openMode: "SAME_TAB", externalUrl: null, storageKey: `reports/${id}.jpg`, mimeType: "image/jpeg", updatedAt, pages: [] })) }] }];
    const listModules = vi.fn().mockResolvedValue(records(["older-report", "newer-report"]));
    const repository = { listModules, listSettings: vi.fn().mockResolvedValue([]) } as unknown as PublicContentRepository;
    const service = new PublicContentService(repository);
    const initial = await service.getContent();
    listModules.mockResolvedValue(records(["newer-report"]));
    const removed = await service.getContent();
    expect(removed.version).not.toBe(initial.version);
    expect(removed.modules[0]?.cards[0]?.buttonText).toBe("查看1份报告");
  });

  it("defensively excludes PDFs, external links, GIFs, and mismatched image metadata", async () => {
    const updatedAt = new Date("2026-08-21T08:00:00.000Z");
    const base = { description: null, openMode: "SAME_TAB", externalUrl: null, updatedAt, pages: [] };
    const repository = {
      listSettings: vi.fn().mockResolvedValue([]),
      listModules: vi.fn().mockResolvedValue([{ id: "module", slug: "review", title: "复核", description: null, updatedAt, cards: [{ id: "card", title: "卡片", description: null, footerNote: null, updatedAt, assets: [
        { ...base, id: "image", title: "静态图片", assetType: "IMAGE", storageKey: "reports/image.webp", mimeType: "image/webp" },
        { ...base, id: "gif", title: "GIF", assetType: "IMAGE", storageKey: "reports/image.gif", mimeType: "image/gif" },
        { ...base, id: "mismatch", title: "伪装扩展名", assetType: "IMAGE", storageKey: "reports/image.jpg", mimeType: "image/png" },
        { ...base, id: "pdf", title: "PDF", assetType: "PDF", storageKey: "reports/file.pdf", mimeType: "application/pdf" },
        { ...base, id: "link", title: "外链", assetType: "EXTERNAL_LINK", storageKey: null, mimeType: "text/html" },
      ] }] }]),
    } as unknown as PublicContentRepository;

    const card = (await new PublicContentService(repository).getContent()).modules[0]?.cards[0];
    expect(card?.assets.map((asset) => asset.id)).toEqual(["image"]);
    expect(card?.buttonText).toBe("查看1份报告");
  });
});
