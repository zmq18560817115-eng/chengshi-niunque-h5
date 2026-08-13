import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = await prisma.reportAsset.findFirst({
    where: { id: assetId, assetType: "IMAGE", contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, reportCard: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, module: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null } } },
    select: { storageKey: true, mimeType: true },
  });
  if (!asset?.storageKey) notFound();
  const stored = await fetch(await getObjectStorage().createReadUrl(asset.storageKey, 60));
  if (!stored.ok || !stored.body) notFound();
  return new NextResponse(stored.body, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType || stored.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
