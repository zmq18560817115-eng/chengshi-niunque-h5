import { getCurrentAdmin } from "@/server/auth/request-session";
import { prisma } from "@/server/db/prisma";
import { DEFAULT_H5_CONTENT } from "@/config/default-h5-content";
import { getObjectStorage } from "@/server/storage";
import { isProductionPublicRecord } from "@/server/public-report-policy";
import { hasMatchingReportImageExtension, isStaticReportImageMimeType } from "@/server/report-image-policy";
import { proxyReportImage, reportImageUnavailableResponse } from "@/server/http/report-image-response";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  if (!await getCurrentAdmin()) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { assetId } = await params;
  const asset = await prisma.reportAsset.findFirst({ where: { id: assetId, assetType: "IMAGE", deletedAt: null }, include: { pages: true, reportCard: { include: { module: true } } } });
  const card = asset?.reportCard;
  if (!asset || !card || card.deletedAt || card.module.deletedAt || !isProductionPublicRecord(asset)
    || !DEFAULT_H5_CONTENT.some((module) => module.slug === card.module.slug && module.cards.some((item) => item.id === card.id))) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const pageId = new URL(request.url).searchParams.get("pageId");
  const page = asset.pages.length ? asset.pages.find((item) => item.id === pageId) : pageId === asset.id ? asset : undefined;
  if (!page?.storageKey || !isStaticReportImageMimeType(page.mimeType) || !hasMatchingReportImageExtension(page.storageKey, page.mimeType)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const stored = await getObjectStorage().read(page.storageKey);
    if (!stored.ok) return reportImageUnavailableResponse();
    const response = proxyReportImage(stored, page.mimeType);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return reportImageUnavailableResponse(); }
}
