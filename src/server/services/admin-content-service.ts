import { AdminContentRepository } from "@/server/repositories/admin-content-repository";
import { lifecycle, validateAssetInput, validateCardInput, validateModuleInput } from "@/server/validation/admin-content";
import { defaultH5SiteConfig, resolveH5SiteConfig } from "./h5-site-config";

export class AdminContentService {
  constructor(private readonly repository = new AdminContentRepository()) {}
  dashboard() { return this.repository.dashboard(); }
  listModules() { return this.repository.listModules(); }
  getModuleWorkspace(id: string) { return this.repository.getModuleWorkspace(id); }
  getModule(id: string) { return this.repository.getModule(id); }
  getCard(id: string) { return this.repository.getCard(id); }
  getAsset(id: string) { return this.repository.getAsset(id); }
  listCards(moduleId: string) { return this.repository.listCards(moduleId); }
  listAssets(cardId: string) { return this.repository.listAssets(cardId); }
  listAuditLogs(limit?: number) { return this.repository.listAuditLogs(limit); }
  async getH5SiteSetting() { const setting = await this.repository.getSiteSetting("public-site"); return { config: resolveH5SiteConfig(setting?.value), status: setting?.contentStatus ?? "DRAFT", updatedAt: setting?.updatedAt ?? null }; }
  saveH5SiteSetting(raw: Record<string, unknown>, adminId: string) { const status = raw.status === "PUBLISHED" || raw.status === "OFFLINE" ? raw.status : "DRAFT"; const required = (key: keyof typeof defaultH5SiteConfig) => { const value = String(raw[key] ?? "").trim(); if (!value) throw new Error(`${key} 不能为空`); return value; }; const config = resolveH5SiteConfig({ brandName: required("brandName"), guideTitle: required("guideTitle"), guideDescription: required("guideDescription"), guideButtonText: required("guideButtonText"), guideDelaySeconds: defaultH5SiteConfig.guideDelaySeconds, archiveEyebrow: required("archiveEyebrow"), archiveTitle: required("archiveTitle"), archiveDescription: required("archiveDescription"), evidenceTitle: required("evidenceTitle"), evidenceSubtitle: required("evidenceSubtitle"), storyEyebrow: required("storyEyebrow"), storyTitle: required("storyTitle"), storyDescription: required("storyDescription") }); return this.repository.saveSiteSetting("public-site", config, status, adminId); }

  async createModule(raw: Record<string, unknown>, adminId: string) { const input = validateModuleInput(raw); return this.repository.createModule({ title: input.title, slug: input.slug, description: input.description, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateModule(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getModule(id)); const input = validateModuleInput(raw); return this.repository.updateModule(id, { title: input.title, slug: input.slug, description: input.description, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteModule(id: string, adminId: string) { return this.repository.deleteModule(id, adminId); }
  moveModule(id: string, direction: "up" | "down", adminId: string) { return this.repository.moveModule(id, direction, adminId); }

  async createCard(raw: Record<string, unknown>, adminId: string) { const input = validateCardInput(raw); await this.required(this.repository.getModule(input.moduleId)); return this.repository.createCard({ module: { connect: { id: input.moduleId } }, title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateCard(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getCard(id)); const input = validateCardInput(raw); return this.repository.updateCard(id, { title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteCard(id: string, adminId: string) { return this.repository.deleteCard(id, adminId); }

  async createAsset(raw: Record<string, unknown>, adminId: string) { const input = validateAssetInput(raw); await this.required(this.repository.getCard(input.reportCardId)); return this.repository.createAsset({ reportCard: { connect: { id: input.reportCardId } }, title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, mimeType: typeof raw.mimeType === "string" ? raw.mimeType : null, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : null, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateAsset(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getAsset(id)); const input = validateAssetInput(raw); return this.repository.updateAsset(id, { title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, ...(typeof raw.mimeType === "string" ? { mimeType: raw.mimeType, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : null } : {}), sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteAsset(id: string, adminId: string) { return this.repository.deleteAsset(id, adminId); }

  private async required<T>(value: Promise<T | null>): Promise<T> { const result = await value; if (!result) throw new Error("记录不存在或已删除"); return result; }
}
