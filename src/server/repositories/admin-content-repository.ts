import { prisma } from "@/server/db/prisma";
import { FORMAL_H5_CATEGORY_SLUGS } from "@/config/default-h5-content";

const orderBy = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];
export type AssetPageInput = { storageKey: string; mimeType: string; byteSize: bigint | null; pageNumber: number };

export class AdminContentRepository {
  async dashboard() {
    const [total, draft, published, offline, draftCards, draftAssets] = await Promise.all([
      prisma.informationModule.count({ where: { deletedAt: null } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "DRAFT" } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "PUBLISHED" } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "OFFLINE" } }),
      prisma.reportCard.count({ where: { deletedAt: null, contentStatus: "DRAFT" } }),
      prisma.reportAsset.count({ where: { deletedAt: null, contentStatus: "DRAFT" } }),
    ]);
    return { total, draft, published, offline, draftCards, draftAssets };
  }

  listModules() { return prisma.informationModule.findMany({ where: { deletedAt: null }, orderBy, include: { cards: { where: { deletedAt: null }, select: { id: true, _count: { select: { assets: { where: { deletedAt: null } } } } } } } }); }
  listFormalModules() { return prisma.informationModule.findMany({ where: { deletedAt: null, slug: { in: [...FORMAL_H5_CATEGORY_SLUGS] } }, orderBy, include: { cards: { where: { deletedAt: null }, select: { id: true, _count: { select: { assets: { where: { deletedAt: null } } } } } } } }); }
  getModuleWorkspace(id: string) { return prisma.informationModule.findFirst({ where: { id, deletedAt: null }, include: { cards: { where: { deletedAt: null }, orderBy, include: { assets: { where: { deletedAt: null }, orderBy, include: { pages: { orderBy: [{ pageNumber: "asc" }, { id: "asc" }] } } } } } } }); }
  getModule(id: string) { return prisma.informationModule.findFirst({ where: { id, deletedAt: null } }); }
  getCard(id: string) { return prisma.reportCard.findFirst({ where: { id, deletedAt: null }, include: { module: true, assets: { where: { deletedAt: null }, orderBy, include: { pages: { orderBy: [{ pageNumber: "asc" }, { id: "asc" }] } } } } }); }
  getAsset(id: string) { return prisma.reportAsset.findFirst({ where: { id, deletedAt: null }, include: { reportCard: true, pages: { orderBy: [{ pageNumber: "asc" }, { id: "asc" }] } } }); }
  listCards(moduleId: string) { return prisma.reportCard.findMany({ where: { moduleId, deletedAt: null }, orderBy }); }
  listAssets(reportCardId: string) { return prisma.reportAsset.findMany({ where: { reportCardId, deletedAt: null }, orderBy, include: { pages: { orderBy: [{ pageNumber: "asc" }, { id: "asc" }] } } }); }
  listAuditLogs(limit = 100) { return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(200, Math.max(1, limit)), include: { operator: { select: { displayName: true, email: true } } } }); }

  createModule(data: Parameters<typeof prisma.informationModule.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_CREATE", targetType: "InformationModule", targetId: item.id } }); return item; }); }
  updateModule(id: string, data: Parameters<typeof prisma.informationModule.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_UPDATE", targetType: "InformationModule", targetId: id } }); return item; }); }
  deleteModule(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_DELETE", targetType: "InformationModule", targetId: id } }); return item; }); }
  moveModule(id: string, direction: "up" | "down", adminId: string) { return prisma.$transaction(async (tx) => { const current = await tx.informationModule.findFirst({ where: { id, deletedAt: null } }); if (!current) return null; const modules = await tx.informationModule.findMany({ where: { deletedAt: null, contentStatus: current.contentStatus }, orderBy }); const index = modules.findIndex((item) => item.id === id); const other = modules[index + (direction === "up" ? -1 : 1)]; if (index < 0 || !other) return null; await tx.informationModule.update({ where: { id: current.id }, data: { sortOrder: other.sortOrder, updatedById: adminId } }); await tx.informationModule.update({ where: { id: other.id }, data: { sortOrder: current.sortOrder, updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_REORDER", targetType: "InformationModule", targetId: id, detail: { direction, contentStatus: current.contentStatus } } }); return true; }); }

  createCard(data: Parameters<typeof prisma.reportCard.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_CREATE", targetType: "ReportCard", targetId: item.id } }); return item; }); }
  updateCard(id: string, data: Parameters<typeof prisma.reportCard.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_UPDATE", targetType: "ReportCard", targetId: id } }); return item; }); }
  deleteCard(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_DELETE", targetType: "ReportCard", targetId: id } }); return item; }); }

  createAsset(data: Parameters<typeof prisma.reportAsset.create>[0]["data"], pages: AssetPageInput[], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.create({ data }); if (pages.length) await tx.reportAssetPage.createMany({ data: pages.map((page) => ({ ...page, reportAssetId: item.id })) }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_CREATE", targetType: "ReportAsset", targetId: item.id, detail: { pageCount: pages.length } } }); return item; }); }
  updateAsset(id: string, data: Parameters<typeof prisma.reportAsset.update>[0]["data"], pages: AssetPageInput[] | undefined, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data }); if (pages) { await tx.reportAssetPage.deleteMany({ where: { reportAssetId: id } }); if (pages.length) await tx.reportAssetPage.createMany({ data: pages.map((page) => ({ ...page, reportAssetId: id })) }); } await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_UPDATE", targetType: "ReportAsset", targetId: id, detail: pages ? { pageCount: pages.length } : undefined } }); return item; }); }
  deleteAsset(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_DELETE", targetType: "ReportAsset", targetId: id } }); return item; }); }
}
