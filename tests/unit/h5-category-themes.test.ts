import { categoryArtworkLayers, categoryCardFallbacks, categoryCardLayouts, defaultCategoryTheme, getCategoryTheme } from "@/config/h5-category-themes";

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
    ["inspection-projects", "inspection-folder-layer.png"],
    ["review-assurance", "review-folder-layer.png"],
    ["production-traceability", "traceability-folder-layer.png"],
  ])("assembles %s from independent design layers", (slug, folder) => {
    const theme = getCategoryTheme(slug);
    expect(theme.artworkLayers?.map((layer) => layer.id)).toEqual(["paper", "folder", "title-ring", "title-digit", "title", "footer-note"]);
    expect(theme.artworkLayers?.find((layer) => layer.id === "folder")?.src).toContain(folder);
    expect(theme.artworkLayers?.find((layer) => layer.id === "folder")).toMatchObject({ width: 2502, height: 4334 });
    expect(theme.artworkLayers?.some((layer) => layer.src.endsWith("-source.jpg"))).toBe(false);
  });

  it("keeps every category composition on the supplied 2000 × 4333 master", () => {
    expect(Object.values(categoryArtworkLayers).every((layers) => layers[0].width === 2000 && layers[0].height === 4333 && layers[0].y === -76)).toBe(true);
    expect(categoryArtworkLayers["inspection-projects"].find((layer) => layer.id === "folder")).toMatchObject({ x: -199, y: 136 });
    expect(categoryArtworkLayers["review-assurance"].find((layer) => layer.id === "folder")).toMatchObject({ x: -199, y: 136 });
    expect(categoryArtworkLayers["production-traceability"].find((layer) => layer.id === "folder")).toMatchObject({ x: -183, y: 130 });
    expect(categoryArtworkLayers["inspection-projects"].at(-1)?.y).toBe(3814);
    expect(categoryArtworkLayers["review-assurance"].at(-1)?.y).toBe(3814);
    expect(categoryArtworkLayers["production-traceability"].at(-1)?.y).toBe(2895);
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
