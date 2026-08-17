export const defaultCategoryTheme = {
  theme: "default",
  backgroundClass: "report-page--default",
  label: "报告资料",
  artwork: null,
} as const;

export type CategoryCardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
};

export type CategoryCardFallback = {
  title: string;
  description: string;
  buttonText: string;
  statusText: string;
};

const sharedCardDescription = "DHA、ARA有没有达到标签标示量。妈妈只看报告结论是否“符合/通过”，不用自己算公式。";

// Coordinates use the same 1000 x 2166 master as every category artwork.
// The runtime scales the complete composition; it never repositions cards per viewport.
export const categoryCardLayouts = {
  "inspection-projects": [
    { x: 59, y: 527, width: 823, height: 381, contentX: 66, contentY: 76, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 374, contentX: 66, contentY: 86, contentWidth: 716 },
    { x: 59, y: 1427, width: 823, height: 389, contentX: 66, contentY: 128, contentWidth: 716 },
  ],
  "review-assurance": [
    { x: 59, y: 527, width: 823, height: 376, contentX: 66, contentY: 76, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 369, contentX: 66, contentY: 86, contentWidth: 716 },
    { x: 59, y: 1421, width: 823, height: 391, contentX: 66, contentY: 128, contentWidth: 716 },
  ],
  "production-traceability": [
    { x: 59, y: 528, width: 823, height: 375, contentX: 66, contentY: 76, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 370, contentX: 66, contentY: 86, contentWidth: 716 },
  ],
} satisfies Record<string, CategoryCardLayout[]>;

export const categoryCardFallbacks = {
  "inspection-projects": [
    { title: "核心营养含量", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已通过" },
    { title: "油脂新鲜度", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "符合标准" },
    { title: "安全底线", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已通过" },
  ],
  "review-assurance": [
    { title: "配方与标签", description: sharedCardDescription, buttonText: "查看4份报告", statusText: "已核对" },
    { title: "原料与工艺", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "已留档" },
    { title: "稳定性与感官", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "持续关注" },
  ],
  "production-traceability": [
    { title: "生产资质", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已核验" },
    { title: "质量管理", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "已核对" },
  ],
} satisfies Record<string, CategoryCardFallback[]>;

export const categoryThemes = {
  "inspection-projects": { theme: "inspection", backgroundClass: "report-page--inspection", label: "检测项目", artwork: "category-inspection-clean.webp", cardSlots: 3 },
  "review-assurance": { theme: "review", backgroundClass: "report-page--review", label: "复核保障", artwork: "category-review-clean.webp", cardSlots: 3 },
  "production-traceability": { theme: "traceability", backgroundClass: "report-page--traceability", label: "生产溯源", artwork: "category-traceability-clean.webp", cardSlots: 2 },
} as const;

export const placeholderCardId = (index: number) => `placeholder-slot-${index + 1}`;

export function getPlaceholderSlot(slug: string, cardId: string) {
  const theme = getCategoryTheme(slug);
  const match = /^placeholder-slot-(\d+)$/.exec(cardId);
  if (!theme.artwork || !match) return null;
  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 && index < theme.cardSlots ? index : null;
}

export function getCategoryTheme(slug: string) {
  const theme = categoryThemes[slug as keyof typeof categoryThemes];
  if (!theme) return defaultCategoryTheme;
  return {
    ...theme,
    cardLayouts: categoryCardLayouts[slug as keyof typeof categoryCardLayouts],
    cardFallbacks: categoryCardFallbacks[slug as keyof typeof categoryCardFallbacks],
  };
}
