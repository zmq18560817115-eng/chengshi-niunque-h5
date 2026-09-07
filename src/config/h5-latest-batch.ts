export const latestBatchSettingKey = "latest-public-batch";
export type LatestBatch = { regularBatch: string; trialBatch: string; inspectionDate: string };
export const defaultLatestBatch: LatestBatch = { regularBatch: "GD00046087", trialBatch: "GD00046086", inspectionDate: "2026-08" };

export function isBatchCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,23}$/.test(value);
}

export function isInspectionDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999) return false;
  return !day || day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function resolveLatestBatch(value: unknown): LatestBatch {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    regularBatch: isBatchCode(input.regularBatch) ? input.regularBatch : defaultLatestBatch.regularBatch,
    trialBatch: isBatchCode(input.trialBatch) ? input.trialBatch : defaultLatestBatch.trialBatch,
    inspectionDate: isInspectionDate(input.inspectionDate) ? input.inspectionDate : defaultLatestBatch.inspectionDate,
  };
}

export function formatInspectionDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day ? `${day}日` : ""}`;
}

export function isDefaultLatestBatch(value: LatestBatch) {
  return value.regularBatch === defaultLatestBatch.regularBatch && value.trialBatch === defaultLatestBatch.trialBatch && value.inspectionDate === defaultLatestBatch.inspectionDate;
}
