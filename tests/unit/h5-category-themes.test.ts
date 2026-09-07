import { categoryArtworkLayers, categoryCardFallbacks, categoryCardLayouts, categoryControlAssets, categoryReadinessAssets, categoryRouteWarmAssets, defaultCategoryTheme, getCategoryTheme } from "@/config/h5-category-themes";

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
    ["inspection-projects", "inspection-83.webp"],
    ["review-assurance", "review-107.webp"],
    ["production-traceability", "traceability-131.webp"],
  ])("assembles %s from independent design layers", (slug, folder) => {
    const theme = getCategoryTheme(slug);
    expect(theme.artworkLayers?.map((layer) => layer.id)).toEqual(slug === "production-traceability" ? ["paper", "folder", "title"] : ["paper", "folder", "title", "footer-note"]);
    expect(theme.artworkLayers?.find((layer) => layer.id === "folder")?.src).toContain(folder);
    expect(theme.artworkLayers?.find((layer) => layer.id === "folder")?.height).toBeGreaterThanOrEqual(5081);
    expect(theme.artworkLayers?.some((layer) => layer.src.endsWith("-source.jpg"))).toBe(false);
  });

  it("keeps every category composition on the supplied 2000 × 4333 master", () => {
    expect(Object.values(categoryArtworkLayers).every((layers) => layers[0].width === 2000 && layers[0].height === 4333 && layers[0].y === 0)).toBe(true);
    expect(categoryArtworkLayers["inspection-projects"].find((layer) => layer.id === "folder")).toMatchObject({ x: -111, y: 128 });
    expect(categoryArtworkLayers["review-assurance"].find((layer) => layer.id === "folder")).toMatchObject({ x: -111, y: 128 });
    expect(categoryArtworkLayers["production-traceability"].find((layer) => layer.id === "folder")).toMatchObject({ x: -111, y: 128 });
    expect(categoryArtworkLayers["inspection-projects"].at(-1)?.y).toBe(3669);
    expect(categoryArtworkLayers["review-assurance"].at(-1)?.y).toBe(3669);
    expect(categoryArtworkLayers["production-traceability"].some((layer) => layer.id === "footer-note")).toBe(false);
  });

  it("uses the reference-aligned copy origin for each card artwork", () => {
    for (const cards of Object.values(categoryCardLayouts)) {
      expect(cards[0].y).toBeGreaterThanOrEqual(426);
      expect(cards[0].y).toBeLessThanOrEqual(426.5);
      for (const [index, card] of cards.entries()) {
        expect(card.x).toBeGreaterThanOrEqual(60);
        expect(card.x + card.width).toBeLessThan(1000);
        if (index) expect(card.y).toBeGreaterThan(cards[index - 1].y + cards[index - 1].height);
        expect(card.backplate.src).toMatch(/^\/design\/2026-09-07\/runtime\//);
      }
    }
  });

  it("awaits every independent category layer, card, neutral decoration and CSS control asset", () => {
    const slugs = Object.keys(categoryArtworkLayers) as Array<keyof typeof categoryArtworkLayers>;
    const warmed = new Set(categoryRouteWarmAssets);

    for (const slug of slugs) {
      const expected = [
        ...categoryArtworkLayers[slug].map((layer) => layer.src),
        ...categoryCardLayouts[slug].map((card) => card.backplate.src),
        ...categoryCardFallbacks[slug].map((card) => card.statusBaseArtwork?.src).filter((src): src is string => Boolean(src)),
        ...categoryControlAssets[slug],
      ];
      expect(new Set(categoryReadinessAssets[slug])).toEqual(new Set(expected));
      expect(categoryReadinessAssets[slug]).toHaveLength(new Set(expected).size);
      expect(categoryReadinessAssets[slug].every((src) => warmed.has(src))).toBe(true);
    }
  });

  it("uses new original card copy without adding retired status decorations", () => {
    const cards = Object.values(categoryCardFallbacks).flat();
    const cardsWithSeparateFish = cards.filter((card) => card.statusBaseArtwork);
    expect(cards).toHaveLength(8);
    expect(cards.every((card) => !("statusText" in card) && !("statusArtwork" in card))).toBe(true);
    const serialized = JSON.stringify(categoryCardFallbacks);
    for (const conclusion of ["已通过", "符合标准", "已核对", "已留档", "持续关注", "已核验"]) {
      expect(serialized).not.toContain(conclusion);
    }
    expect(serialized).not.toContain("category-status-");
    expect(cardsWithSeparateFish).toHaveLength(0);
    expect(cardsWithSeparateFish.every((card) => card.statusBaseArtwork?.src.startsWith("/design/2026-09-07/runtime/"))).toBe(true);
    expect(cardsWithSeparateFish.every((card) => (card.statusBaseArtwork?.width ?? 0) >= 412 && card.statusBaseArtwork?.height === 189)).toBe(true);
  });
});
