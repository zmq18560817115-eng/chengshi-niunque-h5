export const STATIC_REPORT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type StaticReportImageMimeType = typeof STATIC_REPORT_IMAGE_MIME_TYPES[number];

export const MAX_REPORT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REPORT_IMAGE_PAGES = 30;
export const MAX_REPORT_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_REPORT_IMAGE_DIMENSION = 12_000;
export const MAX_REPORT_IMAGE_PIXELS = 25_000_000;

const allowedExtensions: Record<StaticReportImageMimeType, ReadonlySet<string>> = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
};

export function isStaticReportImageMimeType(value: string | null | undefined): value is StaticReportImageMimeType {
  return STATIC_REPORT_IMAGE_MIME_TYPES.includes(value as StaticReportImageMimeType);
}

export function hasMatchingReportImageExtension(path: string, mimeType: string): boolean {
  if (!isStaticReportImageMimeType(mimeType)) return false;
  const cleanPath = path.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  const extension = cleanPath.includes(".") ? cleanPath.slice(cleanPath.lastIndexOf(".") + 1) : "";
  return allowedExtensions[mimeType].has(extension);
}

export function hasStaticReportImageExtension(path: string): boolean {
  return STATIC_REPORT_IMAGE_MIME_TYPES.some((mimeType) => hasMatchingReportImageExtension(path, mimeType));
}

export function reportImageExtension(mimeType: StaticReportImageMimeType): "jpg" | "png" | "webp" {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}
