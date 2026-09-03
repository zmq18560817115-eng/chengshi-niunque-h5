import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getPublicDataTimeoutMs } from "@/server/env";
import { proxyReportImage, reportImageUnavailableResponse } from "@/server/http/report-image-response";
import { isProductionPublicRecord } from "@/server/public-report-policy";
import { hasMatchingReportImageExtension, isStaticReportImageMimeType } from "@/server/report-image-policy";
import { getObjectStorage } from "@/server/storage";
import { withTimeout } from "@/server/utils/with-timeout";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  let page: {
    storageKey: string;
    mimeType: string;
    reportAsset: {
      id: string;
      title: string;
      description: string | null;
      reportCard: { id: string; title: string; description: string | null; module: { id: string; title: string; description: string | null } };
    };
  } | null;
  try {
    page = await withTimeout(prisma.reportAssetPage.findFirst({
      where: {
        id: pageId,
        reportAsset: {
          assetType: "IMAGE",
          contentStatus: "PUBLISHED",
          isOnline: true,
          deletedAt: null,
          reportCard: {
            contentStatus: "PUBLISHED",
            isOnline: true,
            deletedAt: null,
            module: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null },
          },
        },
      },
      select: {
        storageKey: true,
        mimeType: true,
        reportAsset: {
          select: {
            id: true,
            title: true,
            description: true,
            reportCard: {
              select: {
                id: true,
                title: true,
                description: true,
                module: { select: { id: true, title: true, description: true } },
              },
            },
          },
        },
      },
    }), getPublicDataTimeoutMs(), "Published report page query");
  } catch {
    return reportImageUnavailableResponse();
  }
  if (!page || !isProductionPublicRecord(page.reportAsset)
    || !isProductionPublicRecord(page.reportAsset.reportCard)
    || !isProductionPublicRecord(page.reportAsset.reportCard.module)
    || !isStaticReportImageMimeType(page.mimeType)
    || !hasMatchingReportImageExtension(page.storageKey, page.mimeType)) notFound();

  let stored: Response;
  try {
    stored = await getObjectStorage().read(page.storageKey, {
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
      ifModifiedSince: request.headers.get("if-modified-since") ?? undefined,
    });
  } catch {
    return reportImageUnavailableResponse();
  }
  if (stored.status === 404) notFound();
  if (stored.status === 304) return proxyReportImage(stored, page.mimeType);
  if (!stored.ok || !stored.body) return reportImageUnavailableResponse();
  return proxyReportImage(stored, page.mimeType);
}
