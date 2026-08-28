import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

const publicVisibility = {
  contentStatus: "PUBLISHED",
  isOnline: true,
  deletedAt: null,
} as const;

const stableOrder = () => [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

const publicModuleQuery = {
  where: publicVisibility,
  orderBy: stableOrder(),
  include: {
    cards: {
      where: publicVisibility,
      orderBy: stableOrder(),
      include: {
        assets: {
          where: publicVisibility,
          orderBy: stableOrder(),
          include: {
            pages: { orderBy: [{ pageNumber: "asc" }, { id: "asc" }] },
          },
        },
      },
    },
  },
} satisfies Prisma.InformationModuleFindManyArgs;

export type PublicModuleRecord = Prisma.InformationModuleGetPayload<typeof publicModuleQuery>;

export class PublicContentRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  listModules(): Promise<PublicModuleRecord[]> {
    return this.client.informationModule.findMany(publicModuleQuery);
  }

  listSettings() {
    return this.client.siteSetting.findMany({
      where: publicVisibility,
      orderBy: stableOrder(),
      select: { key: true, name: true, value: true, updatedAt: true },
    });
  }
}
