export type H5SiteConfig = {
  brandName: string;
  guideTitle: string;
  guideDescription: string;
  guideButtonText: string;
  guideDelaySeconds: number;
  archiveEyebrow: string;
  archiveTitle: string;
  archiveDescription: string;
  evidenceTitle: string;
  evidenceSubtitle: string;
  storyEyebrow: string;
  storyTitle: string;
  storyDescription: string;
};

export const defaultH5SiteConfig: H5SiteConfig = {
  brandName: "Honest Nutri · 诚实纽雀",
  guideTitle: "每一份安心\n都有据可查",
  guideDescription: "向上滑动或点击，进入透明档案",
  guideButtonText: "进入档案",
  guideDelaySeconds: 3,
  archiveEyebrow: "Honest Nutri",
  archiveTitle: "诚实透明档案",
  archiveDescription: "从检测、复核到生产溯源，公开信息按分类持续更新。",
  evidenceTitle: "为宝贝把关",
  evidenceSubtitle: "看清 3 层证据",
  storyEyebrow: "Our promise",
  storyTitle: "把看不见的过程，变成看得见的依据",
  storyDescription: "此处保留品牌初心与底部插画的结构位置，最终文案及视觉待设计确认。",
};

export function resolveH5SiteConfig(value: unknown): H5SiteConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultH5SiteConfig;
  const input = value as Record<string, unknown>;
  const text = (key: keyof H5SiteConfig) => typeof input[key] === "string" && input[key].trim() ? input[key].trim() : defaultH5SiteConfig[key] as string;
  const delay = Number(input.guideDelaySeconds);
  return { brandName: text("brandName"), guideTitle: text("guideTitle"), guideDescription: text("guideDescription"), guideButtonText: text("guideButtonText"), guideDelaySeconds: Number.isFinite(delay) ? Math.min(10, Math.max(0, delay)) : defaultH5SiteConfig.guideDelaySeconds, archiveEyebrow: text("archiveEyebrow"), archiveTitle: text("archiveTitle"), archiveDescription: text("archiveDescription"), evidenceTitle: text("evidenceTitle"), evidenceSubtitle: text("evidenceSubtitle"), storyEyebrow: text("storyEyebrow"), storyTitle: text("storyTitle"), storyDescription: text("storyDescription") };
}
