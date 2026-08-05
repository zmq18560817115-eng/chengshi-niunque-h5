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

  listModules() { return prisma.informationModule.findMany({ where: { deletedAt: null }, orderBy, include: { cards: { where: { deletedAt: null }, select: { id: true, _count: { select: { assets: { where: { deletedAt: null } } } } } } } }); }
  getModuleWorkspace(id: string) { return prisma.informationModule.findFirst({ where: { id, deletedAt: null }, include: { cards: { where: { deletedAt: null }, orderBy, include: { assets: { where: { deletedAt: null }, orderBy } } } } }); }
  getModule(id: string) { return prisma.informationModule.findFirst({ where: { id, deletedAt: null } }); }
  getCard(id: string) { return prisma.reportCard.findFirst({ where: { id, deletedAt: null }, include: { module: true } }); }
  getAsset(id: string) { return prisma.reportAsset.findFirst({ where: { id, deletedAt: null }, include: { reportCard: true } }); }
  listCards(moduleId: string) { return prisma.reportCard.findMany({ where: { moduleId, deletedAt: null }, orderBy }); }
  listAssets(reportCardId: string) { return prisma.reportAsset.findMany({ where: { reportCardId, deletedAt: null }, orderBy }); }
  getSiteSetting(key: string) { return prisma.siteSetting.findFirst({ where: { key, deletedAt: null } }); }
  saveSiteSetting(key: string, value: Parameters<typeof prisma.siteSetting.upsert>[0]["create"]["value"], status: "DRAFT" | "PUBLISHED" | "OFFLINE", adminId: string) { const now = new Date(); const lifecycle = status === "PUBLISHED" ? { isOnline: true, publishedAt: now, offlineAt: null } : status === "OFFLINE" ? { isOnline: false, offlineAt: now } : { isOnline: false }; return prisma.$transaction(async (tx) => { const item = await tx.siteSetting.upsert({ where: { key }, update: { value, contentStatus: status, ...lifecycle, deletedAt: null, updatedById: adminId }, create: { key, name: "H5 全局页面设置", description: "品牌引导页与档案首页的公共内容和交互配置。", value, sortOrder: 10, contentStatus: status, ...lifecycle, createdById: adminId, updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "SITE_SETTING_UPDATE", targetType: "SiteSetting", targetId: item.id, detail: { key, status } } }); return item; }); }

  createModule(data: Parameters<typeof prisma.informationModule.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_CREATE", targetType: "InformationModule", targetId: item.id } }); return item; }); }
  updateModule(id: string, data: Parameters<typeof prisma.informationModule.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_UPDATE", targetType: "InformationModule", targetId: id } }); return item; }); }
  deleteModule(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.informationModule.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_DELETE", targetType: "InformationModule", targetId: id } }); return item; }); }
  moveModule(id: string, direction: "up" | "down", adminId: string) { return prisma.$transaction(async (tx) => { const modules = await tx.informationModule.findMany({ where: { deletedAt: null }, orderBy }); const index = modules.findIndex((item) => item.id === id); const other = modules[index + (direction === "up" ? -1 : 1)]; if (index < 0 || !other) return null; const current = modules[index]; await tx.informationModule.update({ where: { id: current.id }, data: { sortOrder: other.sortOrder, updatedById: adminId } }); await tx.informationModule.update({ where: { id: other.id }, data: { sortOrder: current.sortOrder, updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "MODULE_REORDER", targetType: "InformationModule", targetId: id, detail: { direction } } }); return true; }); }

  createCard(data: Parameters<typeof prisma.reportCard.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_CREATE", targetType: "ReportCard", targetId: item.id } }); return item; }); }
  updateCard(id: string, data: Parameters<typeof prisma.reportCard.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_UPDATE", targetType: "ReportCard", targetId: id } }); return item; }); }
  deleteCard(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportCard.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "CARD_DELETE", targetType: "ReportCard", targetId: id } }); return item; }); }

  createAsset(data: Parameters<typeof prisma.reportAsset.create>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.create({ data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_CREATE", targetType: "ReportAsset", targetId: item.id } }); return item; }); }
  updateAsset(id: string, data: Parameters<typeof prisma.reportAsset.update>[0]["data"], adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_UPDATE", targetType: "ReportAsset", targetId: id } }); return item; }); }
  deleteAsset(id: string, adminId: string) { return prisma.$transaction(async (tx) => { const item = await tx.reportAsset.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isOnline: false, contentStatus: "OFFLINE", offlineAt: new Date(), updatedById: adminId } }); await tx.auditLog.create({ data: { operatorId: adminId, action: "ASSET_DELETE", targetType: "ReportAsset", targetId: id } }); return item; }); }
}
