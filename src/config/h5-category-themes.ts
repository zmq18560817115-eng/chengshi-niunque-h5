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
  backplate: { src: string; width: number; height: number };
  contentX: number;
  contentY: number;
  contentWidth: number;
};

export type CategoryCardFallback = {
  title: string;
  description: string;
  buttonText: string;
  statusText: string;
  statusBaseArtwork?: { src: string; width: number; height: number };
  statusArtwork: { src: string; width: number; height: number };
};

const sharedCardDescription = "DHA、ARA有没有达到标签标示量。妈妈只看报告结论是否\"符合/通过\",不用自己算公式。";

const runtimeAsset = (name: string) => `/design/final-v1/category-runtime/${name}`;

// Coordinates use the 1000 x 2166.5 half-scale of the supplied 2000 x 4333
// references. Each blank backplate covers only the baked card copy so the
// managed HTML content and the existing report interactions stay live.
// The runtime scales the complete composition; it never repositions cards per viewport.
export const categoryCardLayouts = {
  "inspection-projects": [
    { x: 60, y: 488.5, width: 874, height: 434.5, backplate: { src: runtimeAsset("inspection-card-1.png"), width: 1748, height: 869 }, contentX: 65, contentY: 80, contentWidth: 742 },
    { x: 65.5, y: 963, width: 874, height: 442, backplate: { src: runtimeAsset("inspection-card-2.png"), width: 1748, height: 884 }, contentX: 59.5, contentY: 81.5, contentWidth: 742 },
    { x: 60, y: 1448, width: 875.5, height: 434.5, backplate: { src: runtimeAsset("inspection-card-3.png"), width: 1751, height: 869 }, contentX: 65, contentY: 81.5, contentWidth: 742 },
  ],
"review-assurance": [
  { x: 60, y: 520, width: 873.5, height: 404, backplate: { src: runtimeAsset("review-card-1.png"), width: 1747, height: 808 }, contentX: 64, contentY: 49, contentWidth: 742 },
  { x: 65.5, y: 1002.5, width: 874.5, height: 404, backplate: { src: runtimeAsset("review-card-2.png"), width: 1749, height: 808 }, contentX: 58.5, contentY: 42, contentWidth: 742 },
  { x: 60, y: 1480, width: 875.5, height: 403.5, backplate: { src: runtimeAsset("review-card-3.png"), width: 1751, height: 807 }, contentX: 64, contentY: 49.5, contentWidth: 742 },
],
  "production-traceability": [
    { x: 60.5, y: 521, width: 873.5, height: 402, backplate: { src: runtimeAsset("traceability-card-1.png"), width: 1747, height: 804 }, contentX: 58.5, contentY: 47.5, contentWidth: 742 },
    { x: 65.5, y: 1002.5, width: 874, height: 404, backplate: { src: runtimeAsset("traceability-card-2.png"), width: 1748, height: 808 }, contentX: 57.5, contentY: 42, contentWidth: 742 },
  ],
} satisfies Record<string, CategoryCardLayout[]>;

export const categoryCardFallbacks: Record<
  keyof typeof categoryCardLayouts,
  CategoryCardFallback[]
> = {
  "inspection-projects": [
    { title: "核心营养含量", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已通过", statusArtwork: { src: "/design/final-v1/category-status-inspection-passed.png", width: 245, height: 102 } },
    { title: "油脂新鲜度", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "符合标准", statusArtwork: { src: "/design/final-v1/category-status-inspection-standard.png", width: 325, height: 102 } },
    { title: "安全底线", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已通过", statusArtwork: { src: "/design/final-v1/category-status-inspection-passed.png", width: 245, height: 102 } },
  ],
  "review-assurance": [
    { title: "配方与标签", description: sharedCardDescription, buttonText: "查看4份报告", statusText: "已核对", statusBaseArtwork: { src: runtimeAsset("review-status-fish-1.png"), width: 413, height: 189 }, statusArtwork: { src: "/design/final-v1/category-status-review-checked.png", width: 244, height: 102 } },
    { title: "原料与工艺", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "已留档", statusBaseArtwork: { src: runtimeAsset("review-status-fish-2.png"), width: 413, height: 189 }, statusArtwork: { src: "/design/final-v1/category-status-review-archived.png", width: 244, height: 102 } },
    { title: "稳定性与感官", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "持续关注", statusBaseArtwork: { src: runtimeAsset("review-status-fish-3.png"), width: 413, height: 189 }, statusArtwork: { src: "/design/final-v1/category-status-review-watch.png", width: 326, height: 102 } },
  ],
  "production-traceability": [
    { title: "生产资质", description: sharedCardDescription, buttonText: "查看2份报告", statusText: "已核验", statusBaseArtwork: { src: runtimeAsset("traceability-status-fish-1.png"), width: 412, height: 189 }, statusArtwork: { src: "/design/final-v1/category-status-traceability-verified.png", width: 245, height: 102 } },
    { title: "质量管理", description: sharedCardDescription, buttonText: "查看3份报告", statusText: "已核对", statusBaseArtwork: { src: runtimeAsset("traceability-status-fish-2.png"), width: 412, height: 189 }, statusArtwork: { src: "/design/final-v1/category-status-traceability-checked.png", width: 245, height: 102 } },
  ],
};

export const categoryThemes = {
  "inspection-projects": { theme: "inspection", backgroundClass: "report-page--inspection", label: "检测项目", artwork: "category-runtime/inspection-source.jpg", cardSlots: 3 },
  "review-assurance": { theme: "review", backgroundClass: "report-page--review", label: "复核保障", artwork: "category-runtime/review-source.jpg", cardSlots: 3 },
  "production-traceability": { theme: "traceability", backgroundClass: "report-page--traceability", label: "生产溯源", artwork: "category-runtime/traceability-source.jpg", cardSlots: 2 },
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
