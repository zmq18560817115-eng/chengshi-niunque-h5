import { DEFAULT_H5_CONTENT } from "@/config/default-h5-content";
import { resolveCategoryCardCopy, resolveCategoryReportTitle } from "@/config/h5-card-copy";

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

  it("refreshes the previous third review card copy by identity without changing report bindings", () => {
    const previous = {
      id: "seed-card-review-stability-sensory",
      title: "产品基础型检",
      description: "工厂出厂检测和第三方检测，双层兜底检测",
      assets: [{ id: "existing-report" }],
    };
    const expected = { title: "过敏原项筛查", description: "提前为宝宝排查150项致敏风险", buttonText: "查看1份报告" };
    expect(resolveCategoryCardCopy("review-assurance", previous, 0)).toEqual(expected);
    expect(resolveCategoryCardCopy("review-assurance", previous)).toEqual(expected);
    expect(previous.assets).toEqual([{ id: "existing-report" }]);
    const custom = { ...previous, title: "本批次筛查", description: "后台编辑的筛查说明。" };
    expect(resolveCategoryCardCopy("review-assurance", custom, 2)).toMatchObject({ title: custom.title, description: custom.description });
    for (const id of ["managed-custom", "seed-card-review-raw-process"]) {
      expect(resolveCategoryCardCopy("review-assurance", { ...previous, id }, 2)).toMatchObject({ title: previous.title, description: previous.description });
    }
  });

  it("aligns former automatic report names only within their original card", () => {
    const card = { ...DEFAULT_H5_CONTENT[1].cards[2], title: "产品基础型检", assets: [] };
    for (const title of ["产品基础型检报告", "稳定性与感官报告"]) {
      expect(resolveCategoryReportTitle("review-assurance", card, title)).toBe("过敏原项筛查报告");
    }
    expect(resolveCategoryReportTitle("review-assurance", card, "产品基础型检")).toBe("过敏原项筛查");
    for (const title of ["本批次检测报告", "2026年产品基础型检报告", "过敏原项筛查报告"]) {
      expect(resolveCategoryReportTitle("review-assurance", card, title)).toBe(title);
    }
    expect(resolveCategoryReportTitle("review-assurance", { ...card, id: "custom-card" }, "产品基础型检报告")).toBe("产品基础型检报告");
    expect(resolveCategoryReportTitle("review-assurance", { ...card, id: "seed-card-review-raw-process" }, "产品基础型检报告")).toBe("产品基础型检报告");
    expect(resolveCategoryReportTitle("inspection-projects", card, "产品基础型检报告")).toBe("产品基础型检报告");
  });
});
