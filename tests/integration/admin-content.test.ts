import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/modules/route";
import { prisma } from "@/server/db/prisma";
import { AdminContentService } from "@/server/services/admin-content-service";
import { PublicContentService } from "@/server/services/public-content-service";
import { getAdminSeedConfig } from "@/server/env";

describe("admin content management", () => {
  const marker = `admin-test-${Date.now()}`;
  let adminId = "";
  let moduleId = "";
  let cardId = "";
  let assetId = "";

  beforeAll(async () => { adminId = (await prisma.adminUser.findUniqueOrThrow({ where: { email: getAdminSeedConfig().email } })).id; });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { targetId: { in: [moduleId, cardId, assetId].filter(Boolean) } } });
    if (assetId) await prisma.reportAsset.deleteMany({ where: { id: assetId } });
    if (cardId) await prisma.reportCard.deleteMany({ where: { id: cardId } });
    if (moduleId) await prisma.informationModule.deleteMany({ where: { id: moduleId } });
  });

  it("rejects an unauthenticated direct write request", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/modules", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it("creates, updates, sorts, publishes and soft-deletes module, card and asset metadata", async () => {
    const service = new AdminContentService();
    const createdModule = await service.createModule({ title: marker, slug: marker, description: "test", sortOrder: 7, status: "PUBLISHED" }, adminId); moduleId = createdModule.id;
    expect(createdModule).toMatchObject({ contentStatus: "PUBLISHED", isOnline: true, offlineAt: null }); expect(createdModule.publishedAt).toBeInstanceOf(Date);
    await service.updateModule(createdModule.id, { title: marker, slug: marker, description: "updated", sortOrder: 3, status: "PUBLISHED" }, adminId);
    const card = await service.createCard({ moduleId, title: `${marker}-card`, description: "test", buttonText: "查看", footerNote: "", sortOrder: 2, status: "PUBLISHED" }, adminId); cardId = card.id;
    await service.updateCard(cardId, { moduleId, title: `${marker}-card-updated`, description: "updated", buttonText: "查看", footerNote: "", sortOrder: 1, status: "PUBLISHED" }, adminId);
    expect(await service.getCard(cardId)).toMatchObject({ title: `${marker}-card-updated`, sortOrder: 1, isOnline: true });
    const asset = await service.createAsset({ reportCardId: cardId, title: `${marker}-asset`, description: "test", assetType: "EXTERNAL_LINK", openMode: "NEW_TAB", externalUrl: "https://example.com/report", storageKey: "", sortOrder: 1, status: "PUBLISHED" }, adminId); assetId = asset.id;
    const publicContent = await new PublicContentService().getContent();
    expect(publicContent.modules.find(item => item.id === moduleId)?.cards[0].assets[0]).toMatchObject({ id: assetId, openMode: "new_tab" });
    await service.updateAsset(assetId, { reportCardId: cardId, title: `${marker}-asset`, assetType: "EXTERNAL_LINK", openMode: "SAME_TAB", externalUrl: "https://example.com/report", sortOrder: 9, status: "OFFLINE" }, adminId);
    expect(await service.getAsset(assetId)).toMatchObject({ contentStatus: "OFFLINE", isOnline: false });
    await service.deleteAsset(assetId, adminId); await service.deleteCard(cardId, adminId); await service.deleteModule(moduleId, adminId);
    expect((await new PublicContentService().getContent()).modules.some(item => item.id === moduleId)).toBe(false);
  });

  it("rejects invalid slug, URL, and storage metadata", async () => {
    const service = new AdminContentService();
    await expect(service.createModule({ title: "x", slug: "Invalid Slug", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/slug/);
    await expect(service.createAsset({ reportCardId: cardId || "x", title: "x", assetType: "EXTERNAL_LINK", openMode: "NEW_TAB", externalUrl: "javascript:alert(1)", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/URL/);
    await expect(service.createAsset({ reportCardId: cardId || "x", title: "x", assetType: "PDF", openMode: "SAME_TAB", storageKey: "", sortOrder: 0, status: "DRAFT" }, adminId)).rejects.toThrow(/存储键/);
  });
});
