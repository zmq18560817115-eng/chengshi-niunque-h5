import { designAssets } from "@/config/design-assets.generated";

const percent = (value: number) => `${value / designAssets.archiveHeight * 100}%`;
const folder = (order: number, label: string) => {
  const part = designAssets.archiveFolderHotspots[order];
  return { order, label, left: `${part.x / 20}%`, top: percent(part.y), width: `${part.width / 20}%`, height: percent(part.height), clipPath: `polygon(${part.points.map(([x, y]) => `${x}% ${y}%`).join(",")})` };
};
export const archiveModuleLayout = {
  "inspection-projects": folder(0, "检测项目"),
  "review-assurance": folder(1, "复核保障"),
  "production-traceability": folder(2, "生产溯源"),
} as const;
// Move the second cue down 24 master pixels (9 px on the 750 px design).
// Its artwork and click target share this placement.
export const archiveTitleGroups = designAssets.archiveTitles.map((group) => ({ ...group, cue: { ...group.cue, y: group.cue.y + (group.slug === "review-assurance" ? 24 : 0) } }));
export const archiveClickCueLayouts = archiveTitleGroups.map(({ slug, cue }) => ({ slug, left: `${cue.x / 20}%`, top: percent(cue.y), width: `${cue.width / 20}%`, height: percent(cue.height) }));
export const archiveClickCueLayout = archiveClickCueLayouts[0];
export function getArchiveModuleLayout(slug: string) {
  return archiveModuleLayout[slug as keyof typeof archiveModuleLayout];
}
