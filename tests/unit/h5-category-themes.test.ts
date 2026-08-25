import { categoryCardFallbacks, categoryCardLayouts, defaultCategoryTheme, getCategoryTheme } from "@/config/h5-category-themes";

describe("H5 category report themes", () => {
  it.each([
    ["inspection-projects", "inspection", "report-page--inspection"],
    ["review-assurance", "review", "report-page--review"],
    ["production-traceability", "traceability", "report-page--traceability"],
  ])("maps %s to its fixed theme", (slug, theme, backgroundClass) => {
    expect(getCategoryTheme(slug)).toMatchObject({ theme, backgroundClass });
  });

  it("uses a safe default for unknown slugs", () => {
    expect(getCategoryTheme("unknown-category")).toEqual(defaultCategoryTheme);
  });

  it.each([
    ["inspection-projects", "category-runtime/inspection-source.jpg"],
    ["review-assurance", "category-runtime/review-source.jpg"],
    ["production-traceability", "category-runtime/traceability-source.jpg"],
  ])("uses an artwork with blank business-content cards for %s", (slug, artwork) => {
    expect(getCategoryTheme(slug)).toMatchObject({ artwork });
  });

  it("uses the reference-aligned copy origin for each card artwork", () => {
    expect(categoryCardLayouts["inspection-projects"].map((card) => [card.x, card.y, card.contentX, card.contentY])).toEqual([[60, 488.5, 65, 80], [65.5, 963, 59.5, 81.5], [60, 1448, 65, 81.5]]);
    expect(categoryCardLayouts["review-assurance"].map((card) => [card.x, card.y, card.contentX, card.contentY])).toEqual([[60, 520, 64, 49], [65.5, 1002.5, 58.5, 42], [60, 1480, 64, 49.5]]);
    expect(categoryCardLayouts["production-traceability"].map((card) => [card.x, card.y, card.contentX, card.contentY])).toEqual([[60.5, 521, 58.5, 47.5], [65.5, 1002.5, 57.5, 42]]);
    expect(Object.values(categoryCardLayouts).flat().every((card) => card.backplate.src.startsWith("/design/final-v1/category-runtime/"))).toBe(true);
  });

  it("keeps the artwork status labels aligned with each official category", () => {
    expect(categoryCardFallbacks["inspection-projects"].map((card) => card.statusText)).toEqual(["已通过", "符合标准", "已通过"]);
    expect(categoryCardFallbacks["review-assurance"].map((card) => card.statusText)).toEqual(["已核对", "已留档", "持续关注"]);
    expect(categoryCardFallbacks["production-traceability"].map((card) => card.statusText)).toEqual(["已核验", "已核对"]);
  });

  it("maps every visible status to an original design-text image", () => {
    const cards = Object.values(categoryCardFallbacks).flat();
    const cardsWithSeparateFish = cards.filter((card) => card.statusBaseArtwork);
    expect(cards).toHaveLength(8);
    expect(cards.every((card) => card.statusArtwork.src.startsWith("/design/final-v1/category-status-"))).toBe(true);
    expect(cards.every((card) => card.statusArtwork.width > 0 && card.statusArtwork.height === 102)).toBe(true);
    expect(cardsWithSeparateFish).toHaveLength(5);
    expect(cardsWithSeparateFish.every((card) => card.statusBaseArtwork?.src.startsWith("/design/final-v1/category-runtime/"))).toBe(true);
    expect(cardsWithSeparateFish.every((card) => (card.statusBaseArtwork?.width ?? 0) >= 412 && card.statusBaseArtwork?.height === 189)).toBe(true);
  });
});
