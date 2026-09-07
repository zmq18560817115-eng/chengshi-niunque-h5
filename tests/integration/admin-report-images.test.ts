import { File as NodeFile } from "node:buffer";
import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AdminReportImagesService } from "@/server/services/admin-report-images-service";
import { PublicContentService } from "@/server/services/public-content-service";
import { PublicContentRepository } from "@/server/repositories/public-content-repository";
import type { ObjectStorage } from "@/server/storage/object-storage";

const cardId = "seed-card-inspection-safety";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPz8AAAAASUVORK5CYII=", "base64");
const file = () => new NodeFile([png], "report.png", { type: "image/png" }) as unknown as File;
const rollback = new Error("isolated verification rollback");

// Real Prisma writes and public reads share a transaction that is always rolled
// back. Test images are held in memory and never published to a user's page.
async function isolated(run: (service: AdminReportImagesService, tx: Prisma.TransactionClient, storage: ObjectStorage, objects: Map<string, Uint8Array>, adminId: string) => Promise<void>) {
  const objects = new Map<string, Uint8Array>();
  const storage = { put: vi.fn(async (key: string, body: Uint8Array, contentType: string) => { objects.set(key, body); return { key, size: body.length, contentType }; }),
    remove: vi.fn(async (key: string) => { objects.delete(key); }), exists: vi.fn(async (key: string) => objects.has(key)) } as unknown as ObjectStorage;
  try {
    await prisma.$transaction(async (tx) => {
      const client = { reportCard: tx.reportCard, $transaction: (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => callback(tx) } as unknown as PrismaClient;
      const adminId = (await tx.adminUser.findFirstOrThrow({ where: { status: "ACTIVE", deletedAt: null } })).id;
      await run(new AdminReportImagesService(client, storage), tx, storage, objects, adminId);
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
}

describe("fixed report image publication", () => {
  it("publishes and publicly returns every page above the former count and total-byte limits", async () => {
    await isolated(async (service, tx, _storage, objects, adminId) => {
      const card = (await service.list()).find((item) => item.id === cardId)!;
      const bytes = Buffer.alloc(4 * 1024 * 1024);
      png.copy(bytes);
      const files = Array.from({ length: 31 }, (_, index) => new NodeFile([bytes], `page-${index}.png`, { type: "image/png" }) as unknown as File);
      const assetId = await service.publish({ reportCardId: cardId, revision: card.revision, files }, adminId);
      const publicService = new PublicContentService(new PublicContentRepository(tx as PrismaClient));
      const snapshot = await publicService.getCardSnapshot("inspection-projects", cardId);
      const pages = snapshot.result!.card.assets.find((asset) => asset.id === assetId)!.pages;
      expect(pages.map((page) => page.pageNumber)).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
      expect(objects.size).toBe(31);
      const stored = await tx.reportAsset.findUniqueOrThrow({ where: { id: assetId } });
      expect(stored.byteSize).toBe(BigInt(124 * 1024 * 1024));
    });
  }, 20000);

  it("publishes, replaces and removes images without changing any card/module fields or batch settings", async () => {
    await isolated(async (service, tx, _storage, objects, adminId) => {
      const before = await tx.reportCard.findUniqueOrThrow({ where: { id: cardId } });
      const moduleBefore = await tx.informationModule.findUniqueOrThrow({ where: { id: before.moduleId } });
      const settingsBefore = await tx.siteSetting.findMany({ orderBy: { id: "asc" } });
      const publicService = new PublicContentService(new PublicContentRepository(tx as PrismaClient));
      const original = await publicService.getContent();
      const current = (await service.list()).find((card) => card.id === cardId)!;
      expect(current.category).toBe("检测项目");
      const assetId = await service.publish({ reportCardId: cardId, revision: current.revision, files: [file(), file()] }, adminId);
      const published = await publicService.getContent();
      const asset = published.modules.flatMap((module) => module.cards).find((card) => card.id === cardId)!.assets.find((item) => item.id === assetId)!;
      expect(published.version).not.toBe(original.version);
      expect(asset.pages.map((page) => page.pageNumber)).toEqual([1, 2]);
      expect(objects.size).toBe(2);
      const previousPages = asset.pages.map((page) => page.id);
      const revision = (await service.list()).find((card) => card.id === cardId)!.revision;
      await service.publish({ reportCardId: cardId, assetId, revision, files: [file()] }, adminId);
      const replaced = await publicService.getCardSnapshot("inspection-projects", cardId);
      expect(replaced.version).not.toBe(published.version);
      expect(replaced.result!.card.assets.find((item) => item.id === assetId)!.pages).toHaveLength(1);
      expect(await tx.reportAssetPage.count({ where: { id: { in: previousPages } } })).toBe(0);
      expect(await tx.reportCard.findUnique({ where: { id: cardId } })).toEqual(before);
      expect(await tx.informationModule.findUnique({ where: { id: before.moduleId } })).toEqual(moduleBefore);
      expect(await tx.siteSetting.findMany({ orderBy: { id: "asc" } })).toEqual(settingsBefore);
      await service.remove({ reportCardId: cardId, assetId, revision: (await service.list()).find((card) => card.id === cardId)!.revision }, adminId);
      expect((await publicService.getCard("inspection-projects", cardId))!.card.assets.some((item) => item.id === assetId)).toBe(false);
    });
  });

  it("rejects another card's report, obsolete revisions and invalid files before writing storage", async () => {
    await isolated(async (service, _tx, storage, _objects, adminId) => {
      const cards = await service.list();
      const card = cards.find((item) => item.id === cardId)!;
      await expect(service.publish({ reportCardId: "unapproved-card", revision: card.revision, files: [file()] }, adminId)).rejects.toThrow("正式页面");
      await expect(service.publish({ reportCardId: cardId, revision: "stale", files: [file()] }, adminId)).rejects.toThrow("已被更新");
      await expect(service.publish({ reportCardId: cardId, assetId: "another-report", revision: card.revision, files: [file()] }, adminId)).rejects.toThrow("不属于当前项目");
      await expect(service.publish({ reportCardId: cardId, revision: card.revision, files: [new NodeFile(["invalid"], "invalid.gif", { type: "image/gif" }) as unknown as File] }, adminId)).rejects.toThrow("静态格式");
      expect(storage.put).not.toHaveBeenCalled();
    });
  });

  it("cleans failed uploads without publishing partial pages", async () => {
    await isolated(async (service, tx, storage, objects, adminId) => {
      const card = (await service.list()).find((item) => item.id === cardId)!;
      const count = await tx.reportAsset.count({ where: { reportCardId: cardId } });
      vi.mocked(storage.put).mockImplementationOnce(async (key, bytes, contentType) => { objects.set(key, bytes); return { key, size: bytes.length, contentType }; }).mockRejectedValueOnce(new Error("storage unavailable"));
      await expect(service.publish({ reportCardId: cardId, revision: card.revision, files: [file(), file()] }, adminId)).rejects.toThrow("storage unavailable");
      expect(objects.size).toBe(0);
      expect(await tx.reportAsset.count({ where: { reportCardId: cardId } })).toBe(count);
    });
  });
});
