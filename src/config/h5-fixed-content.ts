export type H5FixedContent = {
  brandName: string; guideTitle: string; guideDescription: string; guideButtonText: string;
  archiveEyebrow: string; archiveTitle: string; archiveDescription: string;
  evidenceTitle: string; evidenceSubtitle: string; storyEyebrow: string;
  storyTitle: string; storyDescription: string; archiveInstruction: string; reportDisclaimer: string;
};

/** Fixed visual copy. It is intentionally not editable from the admin area. */
export const h5FixedContent: H5FixedContent = {
  brandName: "Honest Nutri · 诚实纽雀",
  guideTitle: "每一份安心，都有据可查",
  guideDescription: "向上滑动或点击下方提示，进入透明档案",
  guideButtonText: "进入档案",
  archiveEyebrow: "Honest Nutri",
  archiveTitle: "诚实透明档案",
  archiveDescription: "从检测、复核到生产溯源，公开信息按分类持续更新。",
  evidenceTitle: "为宝贝把关",
  evidenceSubtitle: "看清3层证据",
  storyEyebrow: "品牌初心",
  storyTitle: "不止于宣传数字，我们透明呈现DHA各项指标与安全检测。",
  storyDescription: "给宝宝的营养，看得见、查得准、更放心。",
  archiveInstruction: "查看报告三步走",
  reportDisclaimer: "报告仅供对应批次查阅",
};
