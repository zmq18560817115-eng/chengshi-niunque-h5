import { DEFAULT_H5_CONTENT } from "@/config/default-h5-content";
import { resolveCategoryCardCopy } from "@/config/h5-card-copy";

describe("approved category card copy", () => {
  it("keeps nutrition and freshness descriptions with their card IDs when reordered", () => {
    const cards = DEFAULT_H5_CONTENT[0].cards;
    const nutrition = { ...cards[0], description: "DHA、ARA 等核心营养指标检测结果。", assets: [{ id: "nutrition-report" }] };
    const freshness = { ...cards[1], description: "DHA、ARA 等核心营养指标检测结果。", assets: [{ id: "freshness-report" }] };
    expect(resolveCategoryCardCopy("inspection-projects", nutrition, 1).description).toBe("每粒DHA和ARA的实测含量是多少");
    expect(resolveCategoryCardCopy("inspection-projects", freshness, 0).description).toContain("PV过氧化值、AV酸价");
    expect(nutrition.assets[0].id).toBe("nutrition-report");
    expect(freshness.assets[0].id).toBe("freshness-report");
    const formula = DEFAULT_H5_CONTENT[1].cards[0];
    const previousSeed = { ...formula, description: formula.description.replace("非必要脂肪酸", "非必须脂肪酸"), assets: [] };
    expect(resolveCategoryCardCopy("review-assurance", previousSeed, 0).description).toBe(formula.description);
  });

  it.each(DEFAULT_H5_CONTENT.flatMap((module) => module.cards.map((card) => ({ slug: module.slug, card }))))(
    "uses the same approved copy for $card.id in the category and report pages",
    ({ slug, card }) => {
      const legacyTitle = "legacyTitle" in card ? card.legacyTitle : card.title;
      const legacy = { ...card, title: legacyTitle, description: "复核采用的质量标准与记录。", assets: [] };
      const categoryCopy = resolveCategoryCardCopy(slug, legacy, 0);
      const reportCopy = resolveCategoryCardCopy(slug, legacy);
      expect(categoryCopy).toEqual(reportCopy);
      expect(categoryCopy.title).toBe(card.title);
      expect(categoryCopy.description).toBe(card.description);
    },
  );

  it("preserves explicitly edited descriptions and unknown custom cards", () => {
    const custom = { id: "seed-card-review-raw-process", title: "本月工艺复核", description: "本月公开的原料追溯说明。", assets: [] };
    expect(resolveCategoryCardCopy("review-assurance", custom, 1)).toMatchObject({ title: custom.title, description: custom.description });
    const unknown = { ...custom, id: "managed-custom", description: "复核采用的质量标准与记录。" };
    expect(resolveCategoryCardCopy("review-assurance", unknown, 0).description).toBe(unknown.description);
  });
});
