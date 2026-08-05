import type { AssetOpenMode, AssetType, ContentStatus } from "@prisma/client";

export type ModuleInput = { title: string; slug: string; description?: string; sortOrder: number; status: ContentStatus };
export type CardInput = { moduleId: string; title: string; description?: string; buttonText?: string; footerNote?: string; sortOrder: number; status: ContentStatus };
export type AssetInput = { reportCardId: string; title: string; description?: string; assetType: AssetType; openMode: AssetOpenMode; externalUrl?: string; storageKey?: string; sortOrder: number; status: ContentStatus };
export type PublishCheckItem = { ok: boolean; label: string; detail: string };

const statuses = new Set<ContentStatus>(["DRAFT", "PUBLISHED", "OFFLINE"]);
const assetTypes = new Set<AssetType>(["PDF", "IMAGE", "EXTERNAL_LINK"]);
const openModes = new Set<AssetOpenMode>(["SAME_TAB", "NEW_TAB"]);

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
  if (!assetTypes.has(assetType)) throw new Error("请选择有效的资料类型");
  if (!openModes.has(openMode)) throw new Error("请选择有效的打开方式");
  const externalUrl = optionalText(input.externalUrl);
  const storageKey = optionalText(input.storageKey, 500);
  if (assetType === "EXTERNAL_LINK") {
    if (!externalUrl) throw new Error("请填写外部链接地址");
    let parsed: URL;
    try { parsed = new URL(externalUrl); } catch { throw new Error("请输入完整有效的网址，例如 https://example.com/report"); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("外部链接仅支持 HTTP 或 HTTPS 地址");
  } else if (!storageKey || storageKey.startsWith("/") || storageKey.includes("..")) {
    throw new Error("请在高级设置中填写有效的文件存储路径");
  }
  return { reportCardId: text(input.reportCardId, "所属卡片"), title: text(input.title, "资料名称"), description: optionalText(input.description), assetType, openMode, externalUrl: assetType === "EXTERNAL_LINK" ? externalUrl : undefined, storageKey: assetType === "EXTERNAL_LINK" ? undefined : storageKey, sortOrder: order(input.sortOrder), status: status(input.status) };
}

export function lifecycle(contentStatus: ContentStatus, previous?: { publishedAt: Date | null }) {
  const now = new Date();
  return { contentStatus, isOnline: contentStatus === "PUBLISHED", publishedAt: contentStatus === "PUBLISHED" ? previous?.publishedAt ?? now : previous?.publishedAt ?? null, offlineAt: contentStatus === "OFFLINE" ? now : null };
}

type CheckModule = { title: string; cards: Array<{ title: string; sortOrder: number; contentStatus: ContentStatus; assets: Array<{ title: string; assetType: AssetType; externalUrl: string | null; storageKey: string | null; contentStatus: ContentStatus }> }> };
export function checkModulePublishReadiness(module: CheckModule): PublishCheckItem[] {
  const titledCards = module.cards.filter((card) => card.title.trim());
  const publishedCards = titledCards.filter((card) => card.contentStatus === "PUBLISHED");
  const cardOrders = titledCards.map((card) => card.sortOrder);
  const assets = publishedCards.flatMap((card) => card.assets.filter((asset) => asset.contentStatus === "PUBLISHED"));
  const invalidAssets = assets.filter((asset) => !asset.title.trim() || (asset.assetType === "EXTERNAL_LINK" ? !asset.externalUrl || !/^https?:\/\//.test(asset.externalUrl) : !asset.storageKey));
  const contentComplete = publishedCards.length > 0 && publishedCards.every((card) => card.assets.some((asset) => asset.contentStatus === "PUBLISHED"));
  return [
    { ok: Boolean(module.title.trim()), label: "模块名称", detail: "模块需要清晰的展示名称" },
    { ok: titledCards.length > 0, label: "有效卡片", detail: "至少需要一张已填写标题的卡片" },
    { ok: new Set(cardOrders).size === cardOrders.length, label: "卡片排序", detail: "卡片的页面排序不能重复" },
    { ok: invalidAssets.length === 0, label: "资料配置", detail: invalidAssets.length ? `有 ${invalidAssets.length} 条资料配置不完整` : "资料名称和链接/存储路径有效" },
    { ok: contentComplete, label: "内容完整度", detail: publishedCards.length > 0 ? "每张已发布卡片至少配置一条已发布资料" : "至少需要一张状态为已发布的卡片" },
  ];
}
