import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) { const { assetId } = await params; const asset = await prisma.reportAsset.findFirst({ where: { id: assetId, assetType: "PDF", contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, reportCard: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null, module: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null } } }, select: { storageKey: true } }); if (!asset?.storageKey) notFound(); return NextResponse.redirect(await getObjectStorage().createReadUrl(asset.storageKey, 300)); }
