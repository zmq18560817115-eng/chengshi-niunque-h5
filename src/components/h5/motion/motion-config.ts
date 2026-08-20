const localAcceptance = process.env.NEXT_PUBLIC_H5_MOTION_ACCEPTANCE === "all";
const selectedMotion = process.env.NEXT_PUBLIC_H5_MOTION_MODULE;

const moduleEnabled = (name: string, explicit: string | undefined) => {
  if (explicit === "false") return false;
  if (explicit === "true" || localAcceptance) return true;
  if (selectedMotion) return selectedMotion === name;
  return true;
};

export const H5_MOTION_ENABLED = process.env.NEXT_PUBLIC_H5_MOTION_ENABLED !== "false";
export const H5_MOTION_ACCEPTANCE = localAcceptance;
export const MOTION_ASSET_TIMEOUT_MS = 5000;

export const h5MotionModules = {
  guide: moduleEnabled("guide", process.env.NEXT_PUBLIC_H5_MOTION_GUIDE),
  archiveLatestCircle: moduleEnabled("archiveLatestCircle", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_LATEST_CIRCLE),
  archiveUnlockTab: moduleEnabled("archiveUnlockTab", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_UNLOCK_TAB),
  archiveResultColor: moduleEnabled("archiveResultColor", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_RESULT_COLOR),
  archiveStoryCopy: moduleEnabled("archiveStoryCopy", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_STORY_COPY),
  archiveFishFloat: moduleEnabled("archiveFishFloat", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_FISH_FLOAT),
  archiveSectionTitle: moduleEnabled("archiveSectionTitle", process.env.NEXT_PUBLIC_H5_MOTION_ARCHIVE_SECTION_TITLE),
  categoryEnter: moduleEnabled("categoryEnter", process.env.NEXT_PUBLIC_H5_MOTION_CATEGORY_ENTER),
  reportImageLoad: moduleEnabled("reportImageLoad", process.env.NEXT_PUBLIC_H5_MOTION_REPORT_IMAGE_LOAD),
} as const;

export const h5MotionTiming = {
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  guide: {
    crossfadeMs: 180,
    blinkStartMs: 350,
    blinkHoldMs: 200,
    blinkDurationMs: 270,
    paperStartMs: 420,
    paperDurationMs: 1500,
    hintStartMs: 420,
    hintDurationMs: 560,
    swipeReadyMs: 420,
  },
  archiveLatestCircle: {
    delayMs: 250,
    durationMs: 850,
    threshold: 0.3,
  },
  archiveUnlockTab: {
    triggerDistancePx: 24,
    durationMs: 650,
  },
  archiveResultColor: {
    delayAfterCircleMs: 200,
    durationMs: 700,
    threshold: 0.3,
  },
  archiveStoryCopy: {
    delayMs: 150,
    // 逐字渐显：保持柔边扫入，整体较上一版略微加快。
    lineDurationMs: 2850,
    // 基础行间隔；同一语句的换行通过偏移提前衔接，避免换行处出现停顿。
    lineStepMs: 1850,
    lineOffsetsMs: [0, -350, 0, -950] as const,
    easing: "linear",
    threshold: 0.3,
  },
  revealThreshold: 0.3,
} as const;

export type MotionAsset = {
  src: string;
  masterWidth: number;
  masterHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  initial: string;
  final: string;
  durationMs: number;
  delayMs: number;
  easing: string;
};
