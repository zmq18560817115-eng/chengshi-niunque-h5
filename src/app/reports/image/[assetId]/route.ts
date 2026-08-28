import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getPublicDataTimeoutMs } from "@/server/env";
import { proxyReportImage, reportImageUnavailableResponse } from "@/server/http/report-image-response";
import { hasMatchingReportImageExtension, isStaticReportImageMimeType } from "@/server/report-image-policy";
import { getObjectStorage } from "@/server/storage";
import { withTimeout } from "@/server/utils/with-timeout";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  let asset: { storageKey: string | null; mimeType: string | null } | null;
  try {
    asset = await withTimeout(prisma.reportAsset.findFirst({
      where: { id: assetId, assetType: "IMAGE", contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, reportCard: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, module: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null } } },
      select: { storageKey: true, mimeType: true },
    }), getPublicDataTimeoutMs(), "Published report image query");
  } catch {
    return reportImageUnavailableResponse();
  }
  if (!asset?.storageKey || !isStaticReportImageMimeType(asset.mimeType)
    || !hasMatchingReportImageExtension(asset.storageKey, asset.mimeType)) notFound();

  let stored: Response;
  try {
    stored = await getObjectStorage().read(asset.storageKey, {
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
      ifModifiedSince: request.headers.get("if-modified-since") ?? undefined,
    });
  } catch {
    return reportImageUnavailableResponse();
  }
  if (stored.status === 404) notFound();
  if (stored.status === 304) return proxyReportImage(stored, asset.mimeType);
  if (!stored.ok || !stored.body) return reportImageUnavailableResponse();
  return proxyReportImage(stored, asset.mimeType);
}
