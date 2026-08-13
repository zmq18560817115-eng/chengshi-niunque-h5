export const FORMAL_H5_CATEGORY_SLUGS = [
  "inspection-projects",
  "review-assurance",
  "production-traceability",
] as const;

export type FormalH5CategorySlug = (typeof FORMAL_H5_CATEGORY_SLUGS)[number];

export const DEFAULT_H5_CONTENT = [
  {
    id: "seed-module-inspection",
    slug: "inspection-projects",
    title: "检测项目",
    description: "查看产品检测项目与对应报告资料。",
    sortOrder: 10,
    cards: [
      { id: "seed-card-inspection-nutrition", title: "核心营养含量", description: "DHA、ARA 等核心营养指标检测结果。", sortOrder: 10, legacyTitle: "营养成分检测" },
      { id: "seed-card-inspection-freshness", title: "油脂新鲜度", description: "查看油脂新鲜度相关检测资料。", sortOrder: 20 },
      { id: "seed-card-inspection-safety", title: "安全底线", description: "重金属、微生物及污染物等安全指标资料。", sortOrder: 30, legacyTitle: "安全指标检测" },
    ],
  },
  {
    id: "seed-module-review",
    slug: "review-assurance",
    title: "复核保障",
    description: "查看配方、原料、工艺及稳定性复核资料。",
    sortOrder: 20,
    cards: [
      { id: "seed-card-review-formula-label", title: "配方与标签", description: "配方与标签复核资料。", sortOrder: 10 },
      { id: "seed-card-review-raw-process", title: "原料与工艺", description: "原料与生产工艺复核资料。", sortOrder: 20 },
      { id: "seed-card-review-stability-sensory", title: "稳定性与感官", description: "稳定性与感官复核资料。", sortOrder: 30 },
    ],
  },
  {
    id: "seed-module-traceability",
    slug: "production-traceability",
    title: "生产溯源",
    description: "查看生产资质与质量管理资料。",
    sortOrder: 30,
    cards: [
      { id: "seed-card-traceability-qualification", title: "生产资质", description: "生产主体与资质资料。", sortOrder: 10 },
      { id: "seed-card-traceability-quality", title: "质量管理", description: "生产过程中的质量管理资料。", sortOrder: 20 },
    ],
  },
] as const;

export const LEGACY_UNCERTAIN_CARD_IDS = [
  "seed-card-review-process",
  "seed-card-review-standard",
  "seed-card-traceability-origin",
  "seed-card-traceability-production",
] as const;

export const ACCEPTANCE_PLACEHOLDER_ASSET_IDS = [
  "test-inline-detail-image-1",
  "test-inline-detail-image-2",
  "test-inline-detail-image-3",
  "test-inline-detail-image-4",
  "test-inline-detail-image-5",
] as const;
