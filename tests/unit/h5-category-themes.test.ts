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
    ["inspection-projects", "category-inspection-clean.webp"],
    ["review-assurance", "category-review-clean.webp"],
    ["production-traceability", "category-traceability-clean.webp"],
  ])("uses an artwork with blank business-content cards for %s", (slug, artwork) => {
    expect(getCategoryTheme(slug)).toMatchObject({ artwork });
  });

  it("uses the reference-aligned copy origin for each card artwork", () => {
    expect(categoryCardLayouts["inspection-projects"].map((card) => [card.contentX, card.contentY])).toEqual([[62, 78], [60, 82], [64, 82]]);
    expect(categoryCardLayouts["review-assurance"].map((card) => [card.contentX, card.contentY])).toEqual([[63, 52], [59, 52], [69, 52]]);
    expect(categoryCardLayouts["production-traceability"].map((card) => [card.contentX, card.contentY])).toEqual([[58, 46], [58, 46]]);
  });

  it("keeps the artwork status labels aligned with each official category", () => {
    expect(categoryCardFallbacks["inspection-projects"].map((card) => card.statusText)).toEqual(["已通过", "符合标准", "已通过"]);
    expect(categoryCardFallbacks["review-assurance"].map((card) => card.statusText)).toEqual(["已核对", "已留档", "持续关注"]);
    expect(categoryCardFallbacks["production-traceability"].map((card) => card.statusText)).toEqual(["已核验", "已核对"]);
  });

  it("maps every visible status to an original design-text image", () => {
    const cards = Object.values(categoryCardFallbacks).flat();
    expect(cards).toHaveLength(8);
    expect(cards.every((card) => card.statusArtwork.src.startsWith("/design/final-v1/category-status-"))).toBe(true);
    expect(cards.every((card) => card.statusArtwork.width > 0 && card.statusArtwork.height === 102)).toBe(true);
  });
});
