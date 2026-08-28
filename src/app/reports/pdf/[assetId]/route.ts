import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = await prisma.reportAsset.findFirst({
    where: {
      id: assetId,
      assetType: "PDF",
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
    select: { storageKey: true, mimeType: true },
  });
  if (!asset?.storageKey) notFound();

  const range = request.headers.get("range");
  const stored = await fetch(await getObjectStorage().createReadUrl(asset.storageKey, 60), {
    headers: range ? { Range: range } : undefined,
  });
  if (!stored.ok || !stored.body) notFound();

  const headers = new Headers({
    "Content-Type": asset.mimeType || stored.headers.get("content-type") || "application/pdf",
    "Content-Disposition": "inline",
    "Cache-Control": "private, max-age=60",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["accept-ranges", "content-length", "content-range", "etag", "last-modified"]) {
    const value = stored.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(stored.body, { status: stored.status, headers });
}
