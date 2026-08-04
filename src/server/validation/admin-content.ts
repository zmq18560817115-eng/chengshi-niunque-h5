import type { AssetOpenMode, AssetType, ContentStatus } from "@prisma/client";

export type ModuleInput = { title: string; slug: string; description?: string; sortOrder: number; status: ContentStatus };
export type CardInput = { moduleId: string; title: string; description?: string; buttonText?: string; footerNote?: string; sortOrder: number; status: ContentStatus };
export type AssetInput = { reportCardId: string; title: string; description?: string; assetType: AssetType; openMode: AssetOpenMode; externalUrl?: string; storageKey?: string; sortOrder: number; status: ContentStatus };

const statuses = new Set<ContentStatus>(["DRAFT", "PUBLISHED", "OFFLINE"]);
const assetTypes = new Set<AssetType>(["PDF", "IMAGE", "EXTERNAL_LINK"]);
const openModes = new Set<AssetOpenMode>(["SAME_TAB", "NEW_TAB"]);

function text(value: unknown, name: string, max = 200): string {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new Error(`${name}格式不正确`);
  return result;
}

function optionalText(value: unknown, max = 2000): string | undefined {
  const result = String(value ?? "").trim();
  if (result.length > max) throw new Error("说明内容过长");
  return result || undefined;
}

function order(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > 100000) throw new Error("排序值不正确");
  return result;
}

function status(value: unknown): ContentStatus {
  if (!statuses.has(value as ContentStatus)) throw new Error("内容状态不正确");
  return value as ContentStatus;
}

export function validateModuleInput(input: Record<string, unknown>): ModuleInput {
  const slug = text(input.slug, "slug", 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("slug 只能包含小写字母、数字和连字符");
  return { title: text(input.title, "标题"), slug, description: optionalText(input.description), sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function validateCardInput(input: Record<string, unknown>): CardInput {
  return { moduleId: text(input.moduleId, "所属模块"), title: text(input.title, "标题"), description: optionalText(input.description), buttonText: optionalText(input.buttonText, 80), footerNote: optionalText(input.footerNote), sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function validateAssetInput(input: Record<string, unknown>): AssetInput {
  const assetType = input.assetType as AssetType;
  const openMode = input.openMode as AssetOpenMode;
  if (!assetTypes.has(assetType)) throw new Error("资料类型不正确");
  if (!openModes.has(openMode)) throw new Error("打开方式不正确");
  const externalUrl = optionalText(input.externalUrl);
  const storageKey = optionalText(input.storageKey, 500);
  if (assetType === "EXTERNAL_LINK") {
    if (!externalUrl) throw new Error("外链资料必须填写 URL");
    const parsed = new URL(externalUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("外链 URL 只支持 HTTP 或 HTTPS");
  } else if (!storageKey || storageKey.startsWith("/") || storageKey.includes("..")) {
    throw new Error("PDF 或图片必须填写合法对象存储键");
  }
  return { reportCardId: text(input.reportCardId, "所属卡片"), title: text(input.title, "标题"), description: optionalText(input.description), assetType, openMode, externalUrl: assetType === "EXTERNAL_LINK" ? externalUrl : undefined, storageKey: assetType === "EXTERNAL_LINK" ? undefined : storageKey, sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function lifecycle(status: ContentStatus, previous?: { publishedAt: Date | null }) {
  const now = new Date();
  return {
    contentStatus: status,
    isOnline: status === "PUBLISHED",
    publishedAt: status === "PUBLISHED" ? previous?.publishedAt ?? now : previous?.publishedAt ?? null,
    offlineAt: status === "OFFLINE" ? now : null,
  };
}
