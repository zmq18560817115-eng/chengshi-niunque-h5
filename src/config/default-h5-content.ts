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
      { id: "seed-card-inspection-nutrition", title: "核心营养含量", description: "每粒DHA和ARA的实测含量是多少", sortOrder: 10, legacyTitle: "营养成分检测" },
      { id: "seed-card-inspection-freshness", title: "油脂新鲜度", description: "DHA是多不饱和脂肪酸，除了看含量，也要看PV过氧化值、AV酸价，避免食用过度氧化的藻油", sortOrder: 20 },
      { id: "seed-card-inspection-safety", title: "安全底线", description: "把重金属、致病菌、呕吐毒素、塑化剂、防腐剂、溶剂残留放在一起看，食品安全无小事，这些看不见、闻不到的东西，我们用检测结果替妈妈把关", sortOrder: 30, legacyTitle: "安全指标检测" },
    ],
  },
  {
    id: "seed-module-review",
    slug: "review-assurance",
    title: "复核保障",
    description: "查看非必要物质实测、原料与工艺及过敏原项筛查资料。",
    sortOrder: 20,
    cards: [
      { id: "seed-card-review-formula-label", title: "非必要物质实测", description: "包含EPA、肉豆蔻酸实测含量，总糖实测含量，避免宝宝摄入过多的非必要脂肪酸和糖分，让每口都是需要的营养", sortOrder: 10, legacyTitle: "配方与标签" },
      { id: "seed-card-review-raw-process", title: "原料与工艺", description: "包含FMT580藻油原料COA、原料溯源。妈妈可以看到原料来自哪里", sortOrder: 20 },
      { id: "seed-card-review-stability-sensory", title: "过敏原项筛查", description: "提前为宝宝排查150项致敏风险", sortOrder: 30, legacyTitle: "稳定性与感官" },
    ],
  },
  {
    id: "seed-module-traceability",
    slug: "production-traceability",
    title: "生产溯源",
    description: "查看生产资质与经营资质资料。",
    sortOrder: 30,
    cards: [
      { id: "seed-card-traceability-qualification", title: "生产资质", description: "确认生产方具备对应产品的生产许可、资质文件和基础生产条件", sortOrder: 10 },
      { id: "seed-card-traceability-quality", title: "经营资质", description: "", sortOrder: 20, legacyTitle: "质量管理" },
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
