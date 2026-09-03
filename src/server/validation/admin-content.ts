import type { AssetOpenMode, AssetType, ContentStatus } from "@prisma/client";
import {
  MAX_REPORT_IMAGE_BYTES,
  MAX_REPORT_IMAGE_PAGES,
  MAX_REPORT_TOTAL_BYTES,
  hasMatchingReportImageExtension,
  hasStaticReportImageExtension,
  isStaticReportImageMimeType,
} from "@/server/report-image-policy";

export type ModuleInput = { title: string; slug: string; description?: string; sortOrder: number; status: ContentStatus };
export type CardInput = { moduleId: string; title: string; description?: string; buttonText?: string; footerNote?: string; sortOrder: number; status: ContentStatus };
export type AssetPageInput = { storageKey: string; mimeType: string; byteSize: bigint | null; pageNumber: number };
export type AssetInput = { reportCardId: string; title: string; description?: string; assetType: AssetType; openMode: AssetOpenMode; externalUrl?: string; storageKey?: string; mimeType: string; pages: AssetPageInput[]; sortOrder: number; status: ContentStatus };
export type PublishCheckItem = { ok: boolean; label: string; detail: string };

const statuses = new Set<ContentStatus>(["DRAFT", "PUBLISHED", "OFFLINE"]);
const assetTypes = new Set<AssetType>(["IMAGE"]);
const openModes = new Set<AssetOpenMode>(["SAME_TAB"]);

function text(value: unknown, name: string, max = 200): string {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`请填写${name}`);
  if (result.length > max) throw new Error(`${name}不能超过 ${max} 个字符`);
  return result;
}

function optionalText(value: unknown, max = 2000): string | undefined {
  const result = String(value ?? "").trim();
  if (result.length > max) throw new Error(`内容不能超过 ${max} 个字符`);
  return result || undefined;
}

function order(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > 100000) throw new Error("页面排序必须是 0 到 100000 之间的整数");
  return result;
}

function status(value: unknown): ContentStatus {
  if (!statuses.has(value as ContentStatus)) throw new Error("请选择有效的内容状态");
  return value as ContentStatus;
}

export function validateModuleInput(input: Record<string, unknown>): ModuleInput {
  const slug = text(input.slug, "内部标识", 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("内部标识只能包含小写英文字母、数字和短横线");
  return { title: text(input.title, "模块名称"), slug, description: optionalText(input.description), sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function validateCardInput(input: Record<string, unknown>): CardInput {
  return { moduleId: text(input.moduleId, "所属模块"), title: text(input.title, "卡片标题"), description: optionalText(input.description), buttonText: optionalText(input.buttonText, 80), footerNote: optionalText(input.footerNote), sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function validateAssetInput(input: Record<string, unknown>): AssetInput {
  const assetType = input.assetType as AssetType;
  const openMode = input.openMode as AssetOpenMode;
  if (!assetTypes.has(assetType)) throw new Error("公开报告仅支持静态图片资料");
  if (!openModes.has(openMode)) throw new Error("图片报告仅支持在当前页面打开");
  const storageKey = optionalText(input.storageKey, 500);
  const providedMimeType = optionalText(input.mimeType, 100);
  const pages = Array.isArray(input.pages) ? input.pages.map((value, index) => {
    const page = value as Record<string, unknown>;
    const pageStorageKey = optionalText(page.storageKey, 500);
    const mimeType = optionalText(page.mimeType, 100);
    if (!pageStorageKey || pageStorageKey.startsWith("/") || pageStorageKey.includes("..")) throw new Error(`第 ${index + 1} 张图片的存储路径无效`);
    if (!isStaticReportImageMimeType(mimeType)) throw new Error(`第 ${index + 1} 张图片仅支持 JPG、PNG 或 WebP`);
    if (!hasMatchingReportImageExtension(pageStorageKey, mimeType)) throw new Error(`第 ${index + 1} 张图片的扩展名与格式不一致`);
    const numericByteSize = page.byteSize === null || page.byteSize === undefined ? null : Number(page.byteSize);
    if (numericByteSize !== null && (!Number.isSafeInteger(numericByteSize) || numericByteSize < 1 || numericByteSize > MAX_REPORT_IMAGE_BYTES)) {
      throw new Error(`第 ${index + 1} 张图片大小无效或超过 10MB`);
    }
    const byteSize = numericByteSize === null ? null : BigInt(numericByteSize);
    return { storageKey: pageStorageKey, mimeType, byteSize, pageNumber: index + 1 };
  }) : [];
  if (pages.length > MAX_REPORT_IMAGE_PAGES) throw new Error(`一份报告最多上传 ${MAX_REPORT_IMAGE_PAGES} 张图片`);
  const totalBytes = pages.reduce((sum, page) => sum + (page.byteSize ?? BigInt(0)), BigInt(0));
  if (totalBytes > BigInt(MAX_REPORT_TOTAL_BYTES)) throw new Error("一份报告的图片总大小不能超过 100MB");
  if (storageKey && (storageKey.startsWith("/") || storageKey.includes("..") || !hasStaticReportImageExtension(storageKey))) {
    throw new Error("报告图片的存储路径无效");
  }
  if (pages.length > 0 && storageKey && storageKey !== pages[0]?.storageKey) {
    throw new Error("报告封面路径必须与第一张图片一致");
  }
  if (pages.length === 0 && !storageKey) {
    throw new Error("请至少上传一张报告图片");
  }
  const mimeType = pages[0]?.mimeType ?? providedMimeType;
  if (!isStaticReportImageMimeType(mimeType)
    || (storageKey && !hasMatchingReportImageExtension(storageKey, mimeType))) {
    throw new Error("报告图片的 MIME 类型与扩展名不一致");
  }
  return { reportCardId: text(input.reportCardId, "所属卡片"), title: text(input.title, "资料名称"), description: optionalText(input.description), assetType, openMode, externalUrl: undefined, storageKey, mimeType, pages, sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function lifecycle(contentStatus: ContentStatus, previous?: { publishedAt: Date | null }) {
  const now = new Date();
  return { contentStatus, isOnline: contentStatus === "PUBLISHED", publishedAt: contentStatus === "PUBLISHED" ? previous?.publishedAt ?? now : previous?.publishedAt ?? null, offlineAt: contentStatus === "OFFLINE" ? now : null };
}

export type CheckAsset = {
  title: string;
  assetType: AssetType;
  externalUrl?: string | null;
  storageKey: string | null;
  mimeType?: string | null;
  contentStatus: ContentStatus;
  sortOrder?: number;
  pages?: Array<{ storageKey?: string | null; mimeType?: string | null }>;
};
type CheckModule = { title: string; cards: Array<{ title: string; sortOrder: number; contentStatus: ContentStatus; assets: CheckAsset[] }> };

function isCompletePublishedImage(asset: CheckAsset): boolean {
  if (asset.contentStatus !== "PUBLISHED" || asset.assetType !== "IMAGE" || !asset.title.trim()) return false;
  if (asset.pages?.length) {
    return asset.pages.every((page) => Boolean(
      page.storageKey
      && isStaticReportImageMimeType(page.mimeType)
      && hasMatchingReportImageExtension(page.storageKey, page.mimeType),
    ));
  }
  return Boolean(
    asset.storageKey
    && isStaticReportImageMimeType(asset.mimeType)
    && hasMatchingReportImageExtension(asset.storageKey, asset.mimeType),
  );
}

export function publishedImageStorageKeys(assets: CheckAsset[]): string[] {
  return assets.filter(isCompletePublishedImage).flatMap((asset) => (
    asset.pages?.length
      ? asset.pages.flatMap((page) => page.storageKey ? [page.storageKey] : [])
      : asset.storageKey ? [asset.storageKey] : []
  ));
}

export function checkModulePublishReadiness(module: CheckModule): PublishCheckItem[] {
  const titledCards = module.cards.filter((card) => card.title.trim());
  const publishedCards = titledCards.filter((card) => card.contentStatus === "PUBLISHED");
  const cardOrders = titledCards.map((card) => card.sortOrder);
  const assets = publishedCards.flatMap((card) => card.assets.filter((asset) => asset.contentStatus === "PUBLISHED"));
  const invalidAssets = assets.filter((asset) => !isCompletePublishedImage(asset));
  const duplicateAssetOrders = publishedCards.some((card) => {
    const orders = card.assets.filter((asset) => asset.contentStatus === "PUBLISHED" && asset.sortOrder !== undefined).map((asset) => asset.sortOrder);
    return new Set(orders).size !== orders.length;
  });
  const contentComplete = publishedCards.length > 0 && publishedCards.every((card) => card.assets.some(isCompletePublishedImage));
  return [
    { ok: Boolean(module.title.trim()), label: "模块名称", detail: "模块需要清晰的展示名称" },
    { ok: titledCards.length > 0, label: "有效卡片", detail: "至少需要一张已填写标题的卡片" },
    { ok: new Set(cardOrders).size === cardOrders.length, label: "卡片排序", detail: "卡片的页面排序不能重复" },
    { ok: invalidAssets.length === 0, label: "资料配置", detail: invalidAssets.length ? `有 ${invalidAssets.length} 条资料不是有效的静态图片报告` : "图片资料名称、格式和存储路径有效" },
    { ok: !duplicateAssetOrders, label: "资料排序", detail: duplicateAssetOrders ? "同一卡片内的资料排序不能重复" : "资料排序有效" },
    { ok: contentComplete, label: "内容完整度", detail: publishedCards.length > 0 ? "每张已发布卡片至少配置一条已发布资料" : "至少需要一张状态为已发布的卡片" },
  ];
}

export function cardPublishError(card: { title: string; assets: CheckAsset[] }): string | null {
  if (!card.title.trim()) return "请先填写卡片名称";
  const publishedAssets = card.assets.filter((asset) => asset.contentStatus === "PUBLISHED");
  if (publishedAssets.some((asset) => !isCompletePublishedImage(asset))) return "已发布资料中存在无效或已停用的报告格式，请改建为静态图片报告";
  if (!publishedAssets.some(isCompletePublishedImage)) return "请先为卡片添加并发布至少一份静态图片报告";
  return null;
}
