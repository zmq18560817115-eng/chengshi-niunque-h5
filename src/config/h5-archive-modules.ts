export const archiveModuleLayout = {
  "inspection-projects": { order: 0, left: "43%", top: "48.4%", width: "52%", height: "4.6%", label: "检测项目" },
  "review-assurance": { order: 1, left: "4%", top: "58.2%", width: "53%", height: "3.8%", label: "复核保障" },
  "production-traceability": { order: 2, left: "43%", top: "62%", width: "53%", height: "4.4%", label: "生产溯源" },
} as const;

export function getArchiveModuleLayout(slug: string) {
  return archiveModuleLayout[slug as keyof typeof archiveModuleLayout];
}
