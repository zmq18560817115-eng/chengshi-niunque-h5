import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const modules = await prisma.informationModule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    include: {
      cards: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: {
          assets: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  const publicModules = modules
    .filter((module) => module.contentStatus === "PUBLISHED" && module.isOnline && !module.deletedAt)
    .map((module) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      cards: module.cards
        .filter((card) => card.contentStatus === "PUBLISHED" && card.isOnline && !card.deletedAt)
        .map((card) => ({
          id: card.id,
          title: card.title,
          assets: card.assets
            .filter((asset) => asset.contentStatus === "PUBLISHED" && asset.isOnline && !asset.deletedAt)
            .map((asset) => ({ id: asset.id, title: asset.title, type: asset.assetType })),
        })),
    }));

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    modules: modules.map((module) => ({
      id: module.id,
      slug: module.slug,
      title: module.title,
      status: module.contentStatus,
      isOnline: module.isOnline,
      deletedAt: module.deletedAt,
      sortOrder: module.sortOrder,
      cards: module.cards.map((card) => ({
        id: card.id,
        title: card.title,
        status: card.contentStatus,
        isOnline: card.isOnline,
        deletedAt: card.deletedAt,
        sortOrder: card.sortOrder,
        assets: card.assets.map((asset) => ({
          id: asset.id,
          title: asset.title,
          type: asset.assetType,
          status: asset.contentStatus,
          isOnline: asset.isOnline,
          deletedAt: asset.deletedAt,
          sortOrder: asset.sortOrder,
          storageKey: asset.storageKey,
          externalUrl: asset.externalUrl,
        })),
      })),
    })),
    publicModules,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
