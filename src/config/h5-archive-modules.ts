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

export function getArchiveModuleLayout(slug: string) {
  return archiveModuleLayout[slug as keyof typeof archiveModuleLayout];
}
