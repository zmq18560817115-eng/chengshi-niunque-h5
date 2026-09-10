import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { DEFAULT_H5_CONTENT } from "@/config/default-h5-content";
import { resolveCategoryCardCopy, resolveCategoryReportTitle } from "@/config/h5-card-copy";
import { getCategoryTheme } from "@/config/h5-category-themes";
import { prisma } from "@/server/db/prisma";
import { isProductionPublicRecord } from "@/server/public-report-policy";
import { getObjectStorage } from "@/server/storage";
import type { ObjectStorage } from "@/server/storage/object-storage";
import { validateReportFile } from "@/server/upload/report-file";

const scope = DEFAULT_H5_CONTENT.flatMap((module) => module.cards.map((card) => ({ id: card.id, slug: module.slug })));
const visible = { deletedAt: null, contentStatus: "PUBLISHED" as const, isOnline: true };
const include = { module: true, assets: { where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }], include: { pages: { orderBy: { pageNumber: "asc" as const } } } } };
type CardRecord = Prisma.ReportCardGetPayload<{ include: typeof include }>;
export type ManagedReportCard = {
  id: string; title: string; category: string; slug: string; href: string; revision: string;
  reports: { id: string; title: string; published: boolean; pages: { id: string; href: string }[] }[];
};

function revision(card: CardRecord) {
  return createHash("sha256").update(JSON.stringify(card.assets.map((asset) => [asset.id, asset.updatedAt, asset.pages.map((page) => [page.id, page.updatedAt])]))).digest("hex");
}
function assertCard(card: CardRecord | null): asserts card is CardRecord {
  if (!card || !scope.some((item) => item.id === card.id && item.slug === card.module.slug)
    || card.deletedAt || card.module.deletedAt || !card.isOnline || !card.module.isOnline
    || card.contentStatus !== "PUBLISHED" || card.module.contentStatus !== "PUBLISHED"
    || !isProductionPublicRecord(card) || !isProductionPublicRecord(card.module)) {
    throw new Error("只能维护当前正式页面中已有的报告项目。");
  }
}
function selectedAsset(card: CardRecord, assetId?: string) {
  if (!assetId) return undefined;
  const asset = card.assets.find((item) => item.id === assetId && item.assetType === "IMAGE" && isProductionPublicRecord(item));
  if (!asset) throw new Error("报告不属于当前项目，或已被移除，请刷新后重试。");
  return asset;
}
function assertRevision(card: CardRecord, expected: string) {
  if (!expected || revision(card) !== expected) throw new Error("该项目的图片已被更新，请刷新页面后重新选择，避免覆盖最新内容。");
}

export class AdminReportImagesService {
  constructor(private readonly client: PrismaClient = prisma, private readonly storage: ObjectStorage = getObjectStorage()) {}

  async list(): Promise<ManagedReportCard[]> {
    const cards = await this.client.reportCard.findMany({ where: { ...visible, id: { in: scope.map((item) => item.id) }, module: visible }, include });
    return scope.flatMap((item) => {
      const card = cards.find((row) => row.id === item.id && row.module.slug === item.slug);
      if (!card || !isProductionPublicRecord(card) || !isProductionPublicRecord(card.module)) return [];
      const copy = resolveCategoryCardCopy(item.slug, card);
      return [{ id: card.id, title: copy.title, category: getCategoryTheme(item.slug).label, slug: item.slug,
        href: `/reports/${item.slug}/items/${card.id}/reports`, revision: revision(card),
        reports: card.assets.filter((asset) => asset.assetType === "IMAGE" && isProductionPublicRecord(asset)).map((asset) => ({
          id: asset.id, title: resolveCategoryReportTitle(item.slug, card, asset.title), published: asset.contentStatus === "PUBLISHED" && asset.isOnline,
          pages: (asset.pages.length ? asset.pages : asset.storageKey ? [{ id: asset.id }] : []).map((page) => ({ id: page.id,
            href: `/api/admin/report-images/${asset.id}?pageId=${encodeURIComponent(page.id)}&v=${asset.updatedAt.getTime()}` })),
        })),
      }];
    });
  }

  async publish(input: { reportCardId: string; assetId?: string; revision: string; files: File[] }, adminId: string) {
    const card = await this.client.reportCard.findUnique({ where: { id: input.reportCardId }, include });
    assertCard(card);
    assertRevision(card, input.revision);
    selectedAsset(card, input.assetId);
    if (!input.files.length) throw new Error("请先选择报告图片。");
    // Validate every file before storing anything; client metadata never selects storage keys.
    const checked = [];
    for (const file of input.files) checked.push(await validateReportFile(file, "IMAGE"));
    const pages = checked.map((file, index) => ({ storageKey: `reports/${new Date().getUTCFullYear()}/${randomUUID()}.${file.extension}`,
      mimeType: file.contentType, byteSize: BigInt(file.body.byteLength), pageNumber: index + 1 }));
    const attempted: string[] = [];
    try {
      for (const [index, page] of pages.entries()) {
        attempted.push(page.storageKey);
        await this.storage.put(page.storageKey, checked[index].body, page.mimeType);
      }
      return await this.client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ReportCard" WHERE id = ${input.reportCardId} FOR UPDATE`;
        const current = await tx.reportCard.findUnique({ where: { id: input.reportCardId }, include });
        assertCard(current);
        assertRevision(current, input.revision);
        const existing = selectedAsset(current, input.assetId);
        const data = { storageKey: pages[0].storageKey, mimeType: pages[0].mimeType,
          byteSize: pages.reduce((sum, page) => sum + page.byteSize, BigInt(0)), contentStatus: "PUBLISHED" as const,
          isOnline: true, publishedAt: new Date(), offlineAt: null, updatedById: adminId };
        const asset = existing
          ? await tx.reportAsset.update({ where: { id: existing.id }, data })
          : await tx.reportAsset.create({ data: { ...data, reportCardId: current.id,
            title: `${resolveCategoryCardCopy(current.module.slug, current).title}报告`, assetType: "IMAGE", openMode: "SAME_TAB",
            sortOrder: Math.max(0, ...current.assets.map((item) => item.sortOrder)) + 10, createdById: adminId } });
        await tx.reportAssetPage.deleteMany({ where: { reportAssetId: asset.id } });
        await tx.reportAssetPage.createMany({ data: pages.map((page) => ({ ...page, reportAssetId: asset.id })) });
        await tx.auditLog.create({ data: { operatorId: adminId, action: existing ? "REPORT_IMAGES_REPLACE" : "REPORT_IMAGES_PUBLISH",
          targetType: "ReportAsset", targetId: asset.id, detail: { reportCardId: current.id, pageCount: pages.length } } });
        return asset.id;
      });
    } catch (error) {
      await Promise.all(attempted.map((key) => this.storage.remove(key).catch(() => undefined)));
      throw error;
    }
  }

  async remove(input: { reportCardId: string; assetId: string; revision: string }, adminId: string) {
    if (!input.assetId) throw new Error("请选择需要移除的报告。");
    await this.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReportCard" WHERE id = ${input.reportCardId} FOR UPDATE`;
      const card = await tx.reportCard.findUnique({ where: { id: input.reportCardId }, include });
      assertCard(card);
      assertRevision(card, input.revision);
      const asset = selectedAsset(card, input.assetId)!;
      await tx.reportAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date(), contentStatus: "OFFLINE", isOnline: false, offlineAt: new Date(), updatedById: adminId } });
      await tx.auditLog.create({ data: { operatorId: adminId, action: "REPORT_IMAGES_REMOVE", targetType: "ReportAsset", targetId: asset.id, detail: { reportCardId: card.id } } });
    });
  }
}
