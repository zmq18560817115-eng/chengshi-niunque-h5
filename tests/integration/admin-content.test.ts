import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/modules/route";
import { prisma } from "@/server/db/prisma";
import { AdminContentService } from "@/server/services/admin-content-service";
import { PublicContentService } from "@/server/services/public-content-service";
import { getAdminSeedConfig } from "@/server/env";
import { getObjectStorage } from "@/server/storage";
import { checkModulePublishReadiness } from "@/server/validation/admin-content";

describe("admin content management", () => {
  const marker = `联调验收-H5全链路-${Date.now()}`;
  let adminId = "";
  let moduleId = "";
  let cardId = "";
  let assetId = "";
  const storageKey = `tests/admin-content-${Date.now()}.png`;

  beforeAll(async () => { adminId = (await prisma.adminUser.findUniqueOrThrow({ where: { email: getAdminSeedConfig().email } })).id; });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { targetId: { in: [moduleId, cardId, assetId].filter(Boolean) } } });
    if (assetId) await prisma.reportAsset.deleteMany({ where: { id: assetId } });
    if (cardId) await prisma.reportCard.deleteMany({ where: { id: cardId } });
    if (moduleId) await prisma.informationModule.deleteMany({ where: { id: moduleId } });
    await getObjectStorage().remove(storageKey).catch(() => undefined);
  });

  it("rejects an unauthenticated direct write request", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/modules", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it("moves isolated acceptance data through draft, publish, sort, offline and soft-delete", async () => {
    const service = new AdminContentService();
    const slug = `acceptance-h5-${Date.now()}`;
    await getObjectStorage().put(storageKey, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png");
    const createdModule = await service.createModule({ title: marker, slug, description: "联调草稿", sortOrder: 7, status: "DRAFT" }, adminId); moduleId = createdModule.id;
    const card = await service.createCard({ moduleId, title: `${marker}-卡片`, description: "联调草稿", buttonText: "查看", footerNote: "", sortOrder: 2, status: "DRAFT" }, adminId); cardId = card.id;
    const asset = await service.createAsset({ reportCardId: cardId, title: `${marker}-资料`, description: "联调草稿", assetType: "IMAGE", openMode: "SAME_TAB", storageKey, mimeType: "image/png", sortOrder: 2, status: "DRAFT" }, adminId); assetId = asset.id;
    expect((await new PublicContentService().getContent()).modules.some((item) => item.id === moduleId)).toBe(false);

    await service.updateAsset(assetId, { reportCardId: cardId, title: `${marker}-资料`, assetType: "IMAGE", openMode: "SAME_TAB", storageKey, sortOrder: 1, status: "PUBLISHED" }, adminId);
    await service.updateCard(cardId, { moduleId, title: `${marker}-卡片`, description: "已发布", buttonText: "查看", footerNote: "", sortOrder: 1, status: "PUBLISHED" }, adminId);
    await service.updateModule(createdModule.id, { title: marker, slug, description: "已发布", sortOrder: 3, status: "PUBLISHED" }, adminId);
    expect(await service.getCard(cardId)).toMatchObject({ title: `${marker}-卡片`, sortOrder: 1, isOnline: true });
    const publicContent = await new PublicContentService().getContent();
    expect(publicContent.modules.find((item) => item.id === moduleId)?.cards[0].assets[0]).toMatchObject({ id: assetId, type: "IMAGE", openMode: "same_tab" });
    await service.updateAsset(assetId, { reportCardId: cardId, title: `${marker}-资料`, assetType: "IMAGE", openMode: "SAME_TAB", storageKey, sortOrder: 9, status: "OFFLINE" }, adminId);
    expect(await service.getAsset(assetId)).toMatchObject({ contentStatus: "OFFLINE", isOnline: false });
    expect((await new PublicContentService().getContent()).modules.find((item) => item.id === moduleId)?.cards[0].assets).toHaveLength(0);
    await service.deleteAsset(assetId, adminId); await service.deleteCard(cardId, adminId); await service.deleteModule(moduleId, adminId);
    expect((await new PublicContentService().getContent()).modules.some((item) => item.id === moduleId)).toBe(false);
  });

  it("rejects invalid internal identifiers, URLs, empty titles, and storage metadata", async () => {
    const service = new AdminContentService();
    await expect(service.createModule({ title: "x", slug: "Invalid Slug", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/内部标识/);
    await expect(service.createModule({ title: "", slug: "valid-slug", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/模块名称/);
    await expect(service.createAsset({ reportCardId: cardId || "x", title: "x", assetType: "EXTERNAL_LINK", openMode: "NEW_TAB", externalUrl: "https://example.com/report", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/静态图片/);
    await expect(service.createAsset({ reportCardId: cardId || "x", title: "x", assetType: "PDF", openMode: "SAME_TAB", storageKey: "report.pdf", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/静态图片/);
    await expect(service.createAsset({ reportCardId: cardId || "x", title: "x", assetType: "IMAGE", openMode: "NEW_TAB", storageKey: "report.png", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/当前页面/);
  });

  it("blocks publishing a card without a published asset", async () => {
    const service = new AdminContentService();
    const category = await service.getModule("seed-module-inspection");
    expect(category).not.toBeNull();
    const emptyCard = await service.createCard({ moduleId: category!.id, title: `${marker}-无资料卡片`, description: "", buttonText: "查看报告", footerNote: "", sortOrder: 999, status: "DRAFT" }, adminId);
    try {
      await expect(service.updateCard(emptyCard.id, { moduleId: category!.id, title: `${marker}-无资料卡片`, description: "", buttonText: "查看报告", footerNote: "", sortOrder: 999, status: "PUBLISHED" }, adminId)).rejects.toThrow(/至少一份静态图片报告/);
    } finally {
      await prisma.auditLog.deleteMany({ where: { targetId: emptyCard.id } });
      await prisma.reportCard.delete({ where: { id: emptyCard.id } });
    }
  });

  it("checks publish readiness without changing formal publication state", async () => {
    const incomplete = checkModulePublishReadiness({ title: "待发布模块", cards: [{ title: "报告卡片", sortOrder: 10, contentStatus: "PUBLISHED", assets: [] }] });
    expect(incomplete.find((item) => item.label === "有效卡片")?.ok).toBe(true);
    expect(incomplete.some((item) => !item.ok && item.label === "内容完整度")).toBe(true);
    const draftOnly = checkModulePublishReadiness({ title: "草稿模块", cards: [{ title: "草稿卡片", sortOrder: 10, contentStatus: "DRAFT", assets: [] }] });
    expect(draftOnly.find((item) => item.label === "有效卡片")?.ok).toBe(true);
    expect(draftOnly.find((item) => item.label === "内容完整度")).toMatchObject({ ok: false, detail: "至少需要一张状态为已发布的卡片" });
    const complete = checkModulePublishReadiness({ title: "可发布模块", cards: [{ title: "报告卡片", sortOrder: 10, contentStatus: "PUBLISHED", assets: [{ title: "图片报告", assetType: "IMAGE", storageKey: "reports/report.png", mimeType: "image/png", contentStatus: "PUBLISHED" }] }] });
    expect(complete.every((item) => item.ok)).toBe(true);
    const legacyAnimatedPage = checkModulePublishReadiness({ title: "旧数据模块", cards: [{ title: "报告卡片", sortOrder: 10, contentStatus: "PUBLISHED", assets: [{ title: "旧动画报告", assetType: "IMAGE", storageKey: "reports/report.gif", mimeType: "image/gif", contentStatus: "PUBLISHED", pages: [{ storageKey: "reports/report.gif", mimeType: "image/gif" }] }] }] });
    expect(legacyAnimatedPage.find((item) => item.label === "资料配置")).toMatchObject({ ok: false });
    const current = await prisma.informationModule.findUnique({ where: { id: "seed-module-inspection" }, select: { contentStatus: true } });
    expect(current?.contentStatus).toBe("PUBLISHED");
  });

  it("links admin-authored card text and multi-page image reports to the public card count", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const category = await prisma.informationModule.create({ data: { slug: `linked-report-${suffix}`, title: "联通测试分类", description: "后台分类说明", sortOrder: 9990, contentStatus: "PUBLISHED", isOnline: true, publishedAt: new Date(), createdById: adminId, updatedById: adminId } });
    const card = await prisma.reportCard.create({ data: { moduleId: category.id, title: "后台卡片标题", description: "后台卡片内容", sortOrder: 10, contentStatus: "PUBLISHED", isOnline: true, publishedAt: new Date(), createdById: adminId, updatedById: adminId } });
    const first = await prisma.reportAsset.create({ data: { reportCardId: card.id, title: "第一份报告", assetType: "IMAGE", openMode: "SAME_TAB", storageKey: `reports/${suffix}/1.png`, mimeType: "image/png", sortOrder: 10, contentStatus: "PUBLISHED", isOnline: true, publishedAt: new Date(), createdById: adminId, updatedById: adminId, pages: { create: [
      { storageKey: `reports/${suffix}/1-1.png`, mimeType: "image/png", pageNumber: 1 },
      { storageKey: `reports/${suffix}/1-2.png`, mimeType: "image/png", pageNumber: 2 },
      { storageKey: `reports/${suffix}/1-3.png`, mimeType: "image/png", pageNumber: 3 },
    ] } } });
    const second = await prisma.reportAsset.create({ data: { reportCardId: card.id, title: "第二份报告", assetType: "IMAGE", openMode: "SAME_TAB", storageKey: `reports/${suffix}/2.png`, mimeType: "image/png", sortOrder: 20, contentStatus: "PUBLISHED", isOnline: true, publishedAt: new Date(), createdById: adminId, updatedById: adminId, pages: { create: [{ storageKey: `reports/${suffix}/2-1.png`, mimeType: "image/png", pageNumber: 1 }] } } });

    try {
      const service = new PublicContentService();
      const initial = await service.getModuleBySlug(category.slug);
      expect(initial?.cards[0]).toMatchObject({ title: "后台卡片标题", description: "后台卡片内容", buttonText: "查看2份报告" });
      expect(initial?.cards[0]?.assets.map((asset) => asset.pages.length)).toEqual([3, 1]);

      await prisma.reportCard.update({ where: { id: card.id }, data: { title: "更新后的卡片标题", description: "更新后的卡片内容" } });
      const updated = await service.getModuleBySlug(category.slug);
      expect(updated?.cards[0]).toMatchObject({ title: "更新后的卡片标题", description: "更新后的卡片内容", buttonText: "查看2份报告" });
    } finally {
      await prisma.reportAsset.deleteMany({ where: { id: { in: [first.id, second.id] } } });
      await prisma.reportCard.delete({ where: { id: card.id } });
      await prisma.informationModule.delete({ where: { id: category.id } });
    }
  });
});
