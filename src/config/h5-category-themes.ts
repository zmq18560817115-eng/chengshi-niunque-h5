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

// Coordinates use the same 1000 x 2166 master as every category artwork.
// The runtime scales the complete composition; it never repositions cards per viewport.
export const categoryCardLayouts = {
  "inspection-projects": [
    { x: 59, y: 527, width: 823, height: 381, contentX: 49, contentY: 65, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 374, contentX: 49, contentY: 65, contentWidth: 716 },
    { x: 59, y: 1427, width: 823, height: 389, contentX: 49, contentY: 65, contentWidth: 716 },
  ],
  "review-assurance": [
    { x: 59, y: 527, width: 823, height: 376, contentX: 49, contentY: 65, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 369, contentX: 49, contentY: 65, contentWidth: 716 },
    { x: 59, y: 1421, width: 823, height: 391, contentX: 49, contentY: 65, contentWidth: 716 },
  ],
  "production-traceability": [
    { x: 59, y: 528, width: 823, height: 375, contentX: 49, contentY: 65, contentWidth: 716 },
    { x: 59, y: 987, width: 823, height: 370, contentX: 49, contentY: 65, contentWidth: 716 },
  ],
} satisfies Record<string, CategoryCardLayout[]>;

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
  return { ...theme, cardLayouts: categoryCardLayouts[slug as keyof typeof categoryCardLayouts] };
}
