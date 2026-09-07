import { designAssets } from "@/config/design-assets.generated";
export const defaultCategoryTheme = { theme: "default", backgroundClass: "report-page--default", label: "报告资料", artworkLayers: null } as const;
export type CategoryArtworkLayer = { id: string; src: string; x: number; y: number; width: number; height: number };
export type CategoryPart = Omit<CategoryArtworkLayer, "id">;
export type CategoryCardLayout = { x: number; y: number; width: number; height: number; backplate: { src: string; width: number; height: number }; contentX: number; contentY: number; contentWidth: number };
export type CategoryCardFallback = { title: string; description: string; buttonText: string; titleArtwork: CategoryPart; descriptionArtwork: CategoryPart | null; controls: readonly CategoryPart[]; legacyTitles: readonly string[]; statusBaseArtwork?: { src: string; width: number; height: number } };
type Slug = keyof typeof designAssets.categories;
const slugs = Object.keys(designAssets.categories) as Slug[];
const mapped = <T,>(fn: (slug: Slug) => T) => Object.fromEntries(slugs.map((slug) => [slug, fn(slug)])) as Record<Slug, T>;
export const categoryArtworkLayers = mapped((slug) => designAssets.categories[slug].layers);
export const categoryCardLayouts = mapped<CategoryCardLayout[]>((slug) => designAssets.categories[slug].cards.map((card) => ({ x: card.x, y: card.y, width: card.width, height: card.height, backplate: card.backplate, contentX: card.titleArtwork.x / 2 - card.x, contentY: card.titleArtwork.y / 2 - card.y, contentWidth: 742 })));
const legacyTitles: Record<Slug, string[][]> = { "inspection-projects": [["营养成分检测"], [], ["安全指标检测"]], "review-assurance": [["配方与标签"], [], ["稳定性与感官"]], "production-traceability": [[], ["质量管理"]] };
export const categoryCardFallbacks = mapped<CategoryCardFallback[]>((slug) => designAssets.categories[slug].cards.map((card, index) => ({ title: card.title, description: card.description, buttonText: "点击查看报告", titleArtwork: card.titleArtwork, descriptionArtwork: card.descriptionArtwork, controls: card.controls, legacyTitles: legacyTitles[slug][index] })));
export const categoryControlAssets = mapped((slug) => categoryCardFallbacks[slug].flatMap((card) => [card.titleArtwork.src, ...(card.descriptionArtwork ? [card.descriptionArtwork.src] : []), ...card.controls.map((part) => part.src)]));
export const categoryReadinessAssets = mapped((slug) => [...new Set([...categoryArtworkLayers[slug].map((part) => part.src), ...categoryCardLayouts[slug].map((card) => card.backplate.src), ...categoryControlAssets[slug]])]);

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
