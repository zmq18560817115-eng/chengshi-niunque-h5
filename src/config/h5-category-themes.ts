export const defaultCategoryTheme = {
  theme: "default",
  backgroundClass: "report-page--default",
  label: "报告资料",
  artworkLayers: null,
} as const;

export type CategoryArtworkLayer = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

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

const categoryPaperLayer = {
  id: "paper",
  src: runtimeAsset("category-paper-base.jpg"),
  x: 0,
  y: 0,
  width: 2000,
  height: 4333,
} as const;

const categoryFooterLayer = (y: number) => ({
  id: "footer-note",
  src: runtimeAsset("category-footer-note.png"),
  x: 316,
  y,
  width: 1371,
  height: 318,
}) as const;

// These are the approved independent source parts positioned on the supplied
// 2000 × 4333 reference artboard. The 2502px folder layers deliberately extend
// beyond the central canvas, which supplies the real painted folder texture on
// wider embedded-browser viewports without stretching it.
export const categoryArtworkLayers = {
  "inspection-projects": [
    categoryPaperLayer,
    { id: "folder", src: runtimeAsset("inspection-folder-layer.png"), x: -199, y: 212, width: 2502, height: 4334 },
    { id: "title-ring", src: runtimeAsset("inspection-title-ring.png"), x: 139, y: 674, width: 162, height: 169 },
    { id: "title-digit", src: runtimeAsset("inspection-title-digit.png"), x: 185, y: 701, width: 51, height: 114 },
    { id: "title", src: runtimeAsset("inspection-title.png"), x: 335, y: 668, width: 718, height: 206 },
    categoryFooterLayer(3890),
  ],
  "review-assurance": [
    categoryPaperLayer,
    { id: "folder", src: runtimeAsset("review-folder-layer.png"), x: -199, y: 212, width: 2502, height: 4334 },
    { id: "title-ring", src: runtimeAsset("review-title-ring.png"), x: 132, y: 679, width: 161, height: 170 },
    { id: "title-digit", src: runtimeAsset("review-title-digit.png"), x: 175, y: 706, width: 86, height: 111 },
    { id: "title", src: runtimeAsset("review-title.png"), x: 319, y: 669, width: 718, height: 204 },
    categoryFooterLayer(3890),
  ],
  "production-traceability": [
    categoryPaperLayer,
    { id: "folder", src: runtimeAsset("traceability-folder-layer.png"), x: -183, y: 206, width: 2502, height: 4334 },
    { id: "title-ring", src: runtimeAsset("traceability-title-ring.png"), x: 144, y: 665, width: 161, height: 170 },
    { id: "title-digit", src: runtimeAsset("traceability-title-digit.png"), x: 183, y: 693, width: 81, height: 118 },
    { id: "title", src: runtimeAsset("traceability-title.png"), x: 298, y: 657, width: 718, height: 206 },
    categoryFooterLayer(2971),
  ],
} satisfies Record<string, readonly CategoryArtworkLayer[]>;

// Coordinates use the 1000 x 2166.5 half-scale of the supplied 2000 x 4333
// references. Each blank backplate covers only the baked card copy so the
// managed HTML content and the existing report interactions stay live.
// The runtime scales the complete composition; it never repositions cards per viewport.
export const categoryCardLayouts = {
  "inspection-projects": [
    { x: 60, y: 526.5, width: 874, height: 434.5, backplate: { src: runtimeAsset("inspection-card-1.png"), width: 1748, height: 869 }, contentX: 65, contentY: 80, contentWidth: 742 },
    { x: 65.5, y: 1001, width: 874, height: 442, backplate: { src: runtimeAsset("inspection-card-2.png"), width: 1748, height: 884 }, contentX: 59.5, contentY: 81.5, contentWidth: 742 },
    { x: 60, y: 1486, width: 875.5, height: 434.5, backplate: { src: runtimeAsset("inspection-card-3.png"), width: 1751, height: 869 }, contentX: 65, contentY: 81.5, contentWidth: 742 },
  ],
"review-assurance": [
  { x: 60, y: 558, width: 873.5, height: 404, backplate: { src: runtimeAsset("review-card-1.png"), width: 1747, height: 808 }, contentX: 64, contentY: 49, contentWidth: 742 },
  { x: 65.5, y: 1040.5, width: 874.5, height: 404, backplate: { src: runtimeAsset("review-card-2.png"), width: 1749, height: 808 }, contentX: 58.5, contentY: 42, contentWidth: 742 },
  { x: 60, y: 1518, width: 875.5, height: 403.5, backplate: { src: runtimeAsset("review-card-3.png"), width: 1751, height: 807 }, contentX: 64, contentY: 49.5, contentWidth: 742 },
],
  "production-traceability": [
    { x: 60.5, y: 559, width: 873.5, height: 402, backplate: { src: runtimeAsset("traceability-card-1.png"), width: 1747, height: 804 }, contentX: 58.5, contentY: 47.5, contentWidth: 742 },
    { x: 65.5, y: 1040.5, width: 874, height: 404, backplate: { src: runtimeAsset("traceability-card-2.png"), width: 1748, height: 808 }, contentX: 57.5, contentY: 42, contentWidth: 742 },
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

export const categoryControlAssets = {
  "inspection-projects": [
    "/design/final-v1/category-button-inspection.png",
    "/design/final-v1/category-search-inspection.png",
    "/design/final-v1/category-arrow-inspection.png",
  ],
  "review-assurance": [
    "/design/final-v1/category-button-review.png",
    "/design/final-v1/category-search-review.png",
    "/design/final-v1/category-arrow-review.png",
  ],
  "production-traceability": [
    "/design/final-v1/category-button-production.png",
    "/design/final-v1/category-search-production.png",
    "/design/final-v1/category-arrow-production.png",
  ],
} as const satisfies Record<keyof typeof categoryArtworkLayers, readonly string[]>;

function completeCategoryReadinessAssets(slug: keyof typeof categoryArtworkLayers) {
  return [...new Set([
    ...categoryArtworkLayers[slug].map((layer) => layer.src),
    ...categoryCardLayouts[slug].map((layout) => layout.backplate.src),
    ...categoryCardFallbacks[slug].flatMap((fallback) => [
      fallback.statusArtwork.src,
      fallback.statusBaseArtwork?.src,
    ]),
    ...categoryControlAssets[slug],
  ].filter((src): src is string => Boolean(src)))];
}

// The route may be revealed only after every independent visible component is
// decoded. This includes CSS background artwork as well as rendered <Image>
// parts, so the first category frame cannot gain buttons or status badges late.
export const categoryReadinessAssets = {
  "inspection-projects": completeCategoryReadinessAssets("inspection-projects"),
  "review-assurance": completeCategoryReadinessAssets("review-assurance"),
  "production-traceability": completeCategoryReadinessAssets("production-traceability"),
} as const satisfies Record<keyof typeof categoryArtworkLayers, readonly string[]>;

export const categoryThemes = {
  "inspection-projects": { theme: "inspection", backgroundClass: "report-page--inspection", label: "检测项目", artworkLayers: categoryArtworkLayers["inspection-projects"], readinessAssets: categoryReadinessAssets["inspection-projects"], cardSlots: 3 },
  "review-assurance": { theme: "review", backgroundClass: "report-page--review", label: "复核保障", artworkLayers: categoryArtworkLayers["review-assurance"], readinessAssets: categoryReadinessAssets["review-assurance"], cardSlots: 3 },
  "production-traceability": { theme: "traceability", backgroundClass: "report-page--traceability", label: "生产溯源", artworkLayers: categoryArtworkLayers["production-traceability"], readinessAssets: categoryReadinessAssets["production-traceability"], cardSlots: 2 },
} as const;

// These are exactly the assets awaited by CategoryDetail. Warming the same
// source parts from the archive page avoids a second network/decode pause after
// a module is tapped without introducing any alternate flattened artwork.
export const categoryRouteWarmAssets = [...new Set(Object.values(categoryReadinessAssets).flat())];

export function getCategoryReadinessAssets(slug: string): readonly string[] {
  return categoryReadinessAssets[slug as keyof typeof categoryReadinessAssets] ?? [];
}

export const placeholderCardId = (index: number) => `placeholder-slot-${index + 1}`;

export function getPlaceholderSlot(slug: string, cardId: string) {
  const theme = getCategoryTheme(slug);
  const match = /^placeholder-slot-(\d+)$/.exec(cardId);
  if (!theme.artworkLayers || !match) return null;
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
