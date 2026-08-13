import { DEFAULT_H5_CONTENT, FORMAL_H5_CATEGORY_SLUGS } from "@/config/default-h5-content";

describe("formal H5 default content mapping", () => {
  it("defines exactly the three stable category slugs", () => {
    expect(DEFAULT_H5_CONTENT.map((item) => item.slug)).toEqual([...FORMAL_H5_CATEGORY_SLUGS]);
  });

  it("matches the approved card structure and ordering", () => {
    expect(DEFAULT_H5_CONTENT.map((item) => ({ slug: item.slug, cards: item.cards.map((card) => card.title) }))).toEqual([
      { slug: "inspection-projects", cards: ["核心营养含量", "油脂新鲜度", "安全底线"] },
      { slug: "review-assurance", cards: ["配方与标签", "原料与工艺", "稳定性与感官"] },
      { slug: "production-traceability", cards: ["生产资质", "质量管理"] },
    ]);
  });

  it("uses unique stable identifiers instead of titles as keys", () => {
    const ids = DEFAULT_H5_CONTENT.flatMap((item) => item.cards.map((card) => card.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("seed-card-"))).toBe(true);
  });
});
