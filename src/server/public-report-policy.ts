const reservedPlaceholderPrefix = "placeholder-slot-";
const nonProductionIdPrefixes = ["acceptance-", "e2e-", "test-"] as const;
const nonProductionCopy = /(?:联调(?:资料|样例|测试)|测试(?:资料|样例|占位)|仅供(?:联调|测试))/u;

export type PublicRecordIdentity = {
  id: string;
  title: string;
  description?: string | null;
};

export function isReservedPlaceholderCardId(cardId: string): boolean {
  return cardId.startsWith(reservedPlaceholderPrefix);
}

export function isRetiredPublicTestAssetPath(pathname: string): boolean {
  return /^\/design\/reports\/test-report-\d+\.webp$/i.test(pathname);
}

export function isProductionPublicRecord(record: PublicRecordIdentity): boolean {
  if (record.id.startsWith("seed-asset-")) return false;
  if (nonProductionIdPrefixes.some((prefix) => record.id.startsWith(prefix))) return false;
  return !nonProductionCopy.test(`${record.title}\n${record.description ?? ""}`);
}
