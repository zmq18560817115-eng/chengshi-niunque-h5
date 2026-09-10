import { DEFAULT_H5_CONTENT } from "@/config/default-h5-content";
import { getCategoryTheme } from "@/config/h5-category-themes";

type CardCopy = { id: string; title: string; description: string | null; assets: readonly unknown[] };
const legacyDescriptions = new Set([
  "DHA、ARA 等核心营养指标检测结果。",
  "查看油脂新鲜度相关检测资料。",
  "重金属、微生物及污染物等安全指标资料。",
  "配方与标签复核资料。",
  "原料与生产工艺复核资料。",
  "稳定性与感官复核资料。",
  "复核采用的质量标准与记录。",
  "生产主体与资质资料。",
  "生产过程中的质量管理资料。",
  "DHA是多不饱和脂肪酸，除了看含量，也要看PV过氧化值、AV酸价，避免含量没问题但氧化的藻油",
  "每粒DHA和ARA的实测含量是多少",
  "包含EPA、肉豆蔻酸实测含量，总糖实测含量，避免宝宝摄入过多的非必须脂肪酸和糖分，让每口都是需要的营养",
]);

// Match a published card by identity before using a visual slot. Reordering or
// hiding another card must never give it that neighbour's description/report.
export function resolveCategoryCardCopy(slug: string, card: CardCopy | null, slotIndex?: number) {
  const theme = getCategoryTheme(slug);
  const defaults = DEFAULT_H5_CONTENT.find((item) => item.slug === slug);
  const identityIndex = card ? defaults?.cards.findIndex((item) => item.id === card.id) ?? -1 : -1;
  const index = identityIndex >= 0 ? identityIndex : slotIndex;
  const fallback = theme.artworkLayers && index !== undefined ? theme.cardFallbacks[index] : undefined;
  const description = card?.description?.trim() ?? "";
  const placeholderTitle = !card || /^第\d+项资料$/.test(card.title.trim())
    || (identityIndex >= 0 && fallback?.legacyTitles.includes(card.title));
  const placeholderDescription = !description || description === "资料整理中，正式发布后可在此查看。"
    || (identityIndex >= 0 && legacyDescriptions.has(description))
    || (slug === "review-assurance" && card?.id === "seed-card-review-stability-sensory"
      && description === "工厂出厂检测和第三方检测，双层兜底检测");
  return {
    title: fallback && placeholderTitle ? fallback.title : card?.title ?? fallback?.title ?? "报告资料",
    description: fallback && placeholderDescription ? fallback.description : description,
    buttonText: card?.assets.length ? `查看${card.assets.length}份报告` : card ? "暂无报告" : fallback?.buttonText ?? "查看报告",
  };
}

// Older uploads used the card's former title as their automatic report name.
// Resolve only those exact names for the same fixed card; retain custom names.
export function resolveCategoryReportTitle(slug: string, card: CardCopy, reportTitle: string) {
  const defaults = DEFAULT_H5_CONTENT.find((item) => item.slug === slug);
  const index = defaults?.cards.findIndex((item) => item.id === card.id) ?? -1;
  const theme = getCategoryTheme(slug);
  if (index < 0 || !theme.artworkLayers) return reportTitle;
  const legacyTitles = theme.cardFallbacks[index].legacyTitles;
  const title = resolveCategoryCardCopy(slug, card).title;
  for (const legacyTitle of legacyTitles) {
    if (reportTitle === legacyTitle) return title;
    if (reportTitle === `${legacyTitle}报告`) return `${title}报告`;
  }
  return reportTitle;
}
