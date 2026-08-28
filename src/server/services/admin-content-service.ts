import { AdminContentRepository } from "@/server/repositories/admin-content-repository";
import { cardPublishError, checkModulePublishReadiness, lifecycle, publishedImageStorageKeys, validateAssetInput, validateCardInput, validateModuleInput, type CheckAsset } from "@/server/validation/admin-content";
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
  async updateModule(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getModule(id)); const input = validateModuleInput(raw); if (input.status === "PUBLISHED") { const workspace = await this.required(this.repository.getModuleWorkspace(id)); const failed = checkModulePublishReadiness({ ...workspace, title: input.title }).filter((item) => !item.ok); if (failed.length) throw new Error(`发布失败：${failed.map((item) => `${item.label}（${item.detail}）`).join("；")}`); await this.assertPublishedImageObjects(workspace.cards.flatMap((card) => card.assets)); } return this.repository.updateModule(id, { title: input.title, slug: input.slug, description: input.description, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteModule(id: string, adminId: string) { return this.repository.deleteModule(id, adminId); }
  moveModule(id: string, direction: "up" | "down", adminId: string) { return this.repository.moveModule(id, direction, adminId); }

  async createCard(raw: Record<string, unknown>, adminId: string) { const input = validateCardInput(raw); await this.required(this.repository.getModule(input.moduleId)); return this.repository.createCard({ module: { connect: { id: input.moduleId } }, title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, adminId); }
  async updateCard(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getCard(id)); const input = validateCardInput(raw); if (input.status === "PUBLISHED") { const reason = cardPublishError({ title: input.title, assets: current.assets }); if (reason) throw new Error(`发布失败：${reason}`); await this.assertPublishedImageObjects(current.assets); } return this.repository.updateCard(id, { title: input.title, description: input.description, buttonText: input.buttonText, footerNote: input.footerNote, sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, adminId); }
  deleteCard(id: string, adminId: string) { return this.repository.deleteCard(id, adminId); }

  async createAsset(raw: Record<string, unknown>, adminId: string) { const input = validateAssetInput(raw); await this.required(this.repository.getCard(input.reportCardId)); await this.assertPublishableAsset(input); return this.repository.createAsset({ reportCard: { connect: { id: input.reportCardId } }, title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, mimeType: input.mimeType, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : input.pages.reduce((sum, page) => sum + (page.byteSize ?? BigInt(0)), BigInt(0)) || null, sortOrder: input.sortOrder, ...lifecycle(input.status), createdBy: { connect: { id: adminId } }, updatedBy: { connect: { id: adminId } } }, input.pages, adminId); }
  async updateAsset(id: string, raw: Record<string, unknown>, adminId: string) { const current = await this.required(this.repository.getAsset(id)); const input = validateAssetInput({ ...raw, mimeType: typeof raw.mimeType === "string" ? raw.mimeType : current.mimeType }); await this.assertPublishableAsset(input); const replacesPages = Array.isArray(raw.pages); return this.repository.updateAsset(id, { title: input.title, description: input.description, assetType: input.assetType, openMode: input.openMode, externalUrl: input.externalUrl, storageKey: input.storageKey, ...(typeof raw.mimeType === "string" || replacesPages ? { mimeType: input.mimeType, byteSize: raw.byteSize ? BigInt(Number(raw.byteSize)) : input.pages.reduce((sum, page) => sum + (page.byteSize ?? BigInt(0)), BigInt(0)) || null } : {}), sortOrder: input.sortOrder, ...lifecycle(input.status, current), updatedBy: { connect: { id: adminId } } }, replacesPages ? input.pages : undefined, adminId); }
  deleteAsset(id: string, adminId: string) { return this.repository.deleteAsset(id, adminId); }

  private async required<T>(value: Promise<T | null>): Promise<T> { const result = await value; if (!result) throw new Error("记录不存在或已删除"); return result; }
  private async assertPublishableAsset(input: ReturnType<typeof validateAssetInput>) { if (input.status !== "PUBLISHED") return; const keys = input.pages.length ? input.pages.map((page) => page.storageKey) : input.storageKey ? [input.storageKey] : []; if (!keys.length || (await Promise.all(keys.map((key) => getObjectStorage().exists(key)))).some((exists) => !exists)) throw new Error("发布失败：上传图片不存在，请重新选择图片后保存"); }
  private async assertPublishedImageObjects(assets: CheckAsset[]) {
    const keys = publishedImageStorageKeys(assets);
    try {
      if ((await Promise.all(keys.map((key) => getObjectStorage().exists(key)))).some((exists) => !exists)) {
        throw new Error("missing");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "missing") {
        throw new Error("发布失败：已发布图片在存储中不存在，请重新上传后再发布");
      }
      throw new Error("发布失败：暂时无法核验图片存储，请稍后重试");
    }
  }
}
