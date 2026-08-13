import { AdminContentRepository } from "@/server/repositories/admin-content-repository";
import { cardPublishError, checkModulePublishReadiness, lifecycle, validateAssetInput, validateCardInput, validateModuleInput } from "@/server/validation/admin-content";
import { getObjectStorage } from "@/server/storage";

export class AdminContentService {
  constructor(private readonly repository = new AdminContentRepository()) {}
  dashboard() { return this.repository.dashboard(); }
  listModules() { return this.repository.listModules(); }
  listFormalModules() { return this.repository.listFormalModules(); }
  getModuleWorkspace(id: string) { return this.repository.getModuleWorkspace(id); }
  getModule(id: string) { return this.repository.getModule(id); }
  getCard(id: string) { return this.repository.getCard(id); }
  getAsset(id: string) { return this.repository.getAsset(id); }
  listCards(moduleId: string) { return this.repository.listCards(moduleId); }
  listAssets(cardId: string) { return this.repository.listAssets(cardId); }
  listAuditLogs(limit?: number) { return this.repository.listAuditLogs(limit); }
  async createModule(raw: Record<string, unknown>, adminId: string) { const input = validateModuleInput(raw); return this.repository.createModule({ title: input.title, slug: input.slug, description: input.description, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateModule(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getModule(id)); const input = validateModuleInput(raw); if (input.status === "PUBLISHED") { const workspace = await this.required(this.repository.getModuleWorkspace(id)); const failed = checkModulePublishReadiness({ ...workspace, title: input.title }).filter((item) => !item.ok); if (failed.length) throw new Error(`发布失败：${failed.map((item) => `${item.label}（${item.detail}）`).join("；")}`); } return this.repository.updateModule(id, { title: input.title, slug: input.slug, description: input.description, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteModule(id: string, adminId: string) { return this.repository.deleteModule(id, adminId); }
  moveModule(id: string, direction: "up" | "down", adminId: string) { return this.repository.moveModule(id, direction, adminId); }

  async createCard(raw: Record<string, unknown>, adminId: string) { const input = validateCardInput(raw); await this.required(this.repository.getModule(input.moduleId)); return this.repository.createCard({ module: { connect: { id: input.moduleId } }, title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateCard(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getCard(id)); const input = validateCardInput(raw); if (input.status === "PUBLISHED") { const reason = cardPublishError({ title: input.title, assets: current.assets }); if (reason) throw new Error(`发布失败：${reason}`); } return this.repository.updateCard(id, { title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteCard(id: string, adminId: string) { return this.repository.deleteCard(id, adminId); }

  async createAsset(raw: Record<string, unknown>, adminId: string) { const input = validateAssetInput(raw); await this.required(this.repository.getCard(input.reportCardId)); await this.assertPublishableAsset(input); return this.repository.createAsset({ reportCard: { connect: { id: input.reportCardId } }, title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, mimeType: typeof raw.mimeType === "string" ? raw.mimeType : null, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : null, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateAsset(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getAsset(id)); const input = validateAssetInput(raw); await this.assertPublishableAsset(input); return this.repository.updateAsset(id, { title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, ...(typeof raw.mimeType === "string" ? { mimeType: raw.mimeType, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : null } : {}), sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteAsset(id: string, adminId: string) { return this.repository.deleteAsset(id, adminId); }

  private async required<T>(value: Promise<T | null>): Promise<T> { const result = await value; if (!result) throw new Error("记录不存在或已删除"); return result; }
  private async assertPublishableAsset(input: ReturnType<typeof validateAssetInput>) { if (input.status !== "PUBLISHED" || input.assetType === "EXTERNAL_LINK") return; if (!input.storageKey || !(await getObjectStorage().exists(input.storageKey))) throw new Error("发布失败：上传文件不存在，请重新选择文件后保存"); }
}
