import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const page = await prisma.reportAssetPage.findFirst({
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
  });
  if (!page) notFound();
  const stored = await fetch(await getObjectStorage().createReadUrl(page.storageKey, 60));
  if (!stored.ok || !stored.body) notFound();
  return new Response(stored.body, {
    headers: {
      "Content-Type": page.mimeType || stored.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
