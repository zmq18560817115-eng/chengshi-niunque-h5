export const archiveModuleLayout = {
  "inspection-projects": { order: 0, left: "0%", top: "49.4%", width: "100%", height: "6.85%", label: "检测项目" },
  "review-assurance": { order: 1, left: "0%", top: "56.25%", width: "100%", height: "6.42%", label: "复核保障" },
  "production-traceability": { order: 2, left: "0%", top: "62.67%", width: "100%", height: "6.5%", label: "生产溯源" },
} as const;

export function getArchiveModuleLayout(slug: string) {
  return archiveModuleLayout[slug as keyof typeof archiveModuleLayout];
}
