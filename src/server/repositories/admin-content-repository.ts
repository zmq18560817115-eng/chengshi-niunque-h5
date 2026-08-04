import { prisma } from "@/server/db/prisma";

const orderBy = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];

export class AdminContentRepository {
  async dashboard() {
    const [total, draft, published, offline] = await Promise.all([
      prisma.informationModule.count({ where: { deletedAt: null } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "DRAFT" } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "PUBLISHED" } }),
      prisma.informationModule.count({ where: { deletedAt: null, contentStatus: "OFFLINE" } }),
    ]);
    return { total, draft, published, offline };
  }

  listModules() { return prisma.informationModule.findMany({ where: { deletedAt: null }, orderBy, include: { _count: { select: { cards: { where: { deletedAt: null } } } } } }); }
  getModule(id: string) { return prisma.informationModule.findFirst({ where: { id, deletedAt: null } }); }
  getCard(id: string) { return prisma.reportCard.findFirst({ where: { id, deletedAt: null }, include: { module: true } }); }
  getAsset(id: string) { return prisma.reportAsset.findFirst({ where: { id, deletedAt: null }, include: { reportCard: true } }); }
  listCards(moduleId: string) { return prisma.reportCard.findMany({ where: { moduleId, deletedAt: null }, orderBy }); }
  listAssets(reportCardId: string) { return prisma.reportAsset.findMany({ where: { reportCardId, deletedAt: null }, orderBy }); }

  createModule(data: Parameters<typeof prisma.informationModule.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_CREATE", targetType: "InformationModule", targetId: item.id } }); return item; }); }
  updateModule(id: string, data: Parameters<typeof prisma.informationModule.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_UPDATE", targetType: "InformationModule", targetId: id } }); return item; }); }
  deleteModule(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_DELETE", targetType: "InformationModule", targetId: id } }); return item; }); }

  createCard(data: Parameters<typeof prisma.reportCard.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_CREATE", targetType: "ReportCard", targetId: item.id } }); return item; }); }
  updateCard(id: string, data: Parameters<typeof prisma.reportCard.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_UPDATE", targetType: "ReportCard", targetId: id } }); return item; }); }
  deleteCard(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_DELETE", targetType: "ReportCard", targetId: id } }); return item; }); }

  createAsset(data: Parameters<typeof prisma.reportAsset.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_CREATE", targetType: "ReportAsset", targetId: item.id } }); return item; }); }
  updateAsset(id: string, data: Parameters<typeof prisma.reportAsset.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_UPDATE", targetType: "ReportAsset", targetId: id } }); return item; }); }
  deleteAsset(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_DELETE", targetType: "ReportAsset", targetId: id } }); return item; }); }
}
