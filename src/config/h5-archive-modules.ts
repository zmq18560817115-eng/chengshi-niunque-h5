export const archiveModuleLayout = {
  "inspection-projects": { order: 0, left: "0%", top: "49.406154%", width: "100%", height: "6.84722%", label: "检测项目" },
  "review-assurance": { order: 1, left: "0%", top: "56.253374%", width: "100%", height: "6.415332%", label: "复核保障" },
  "production-traceability": { order: 2, left: "0%", top: "62.668706%", width: "100%", height: "16.051827%", label: "生产溯源" },
} as const;

// The supplied “点击” artwork sits immediately above the green folder tab.
// Keep its hit target registered to that exact artwork rather than enlarging or
// moving the source image.
export const archiveClickCueLayout = {
  left: "53.3%",
  top: "45.80691%",
  width: "42%",
  height: "3.707036%",
} as const;

// “资源 9”里的检测人物从绿色文件夹伸入黄色背景。该窄命中区只覆盖
// 人物左侧轮廓，不扩大绿色色块，也不会遮住黄色标题的正常入口。
export const archiveInspectionMascotLayout = {
  left: "41%",
  top: "52.843261%",
  width: "27%",
  height: "5.758503%",
} as const;

export function getArchiveModuleLayout(slug: string) {
  return archiveModuleLayout[slug as keyof typeof archiveModuleLayout];
}
