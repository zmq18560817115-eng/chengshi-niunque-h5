import { GET } from "@/app/api/public/content/route";
import { PublicContentService } from "@/server/services/public-content-service";
import { prisma } from "@/server/db/prisma";

describe("public content integration", () => {
  it("returns only published, online, non-deleted content in sort order", async () => {
    const content = await new PublicContentService().getContent();
    const expectedModules = await prisma.informationModule.findMany({
      where: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        title: true,
        slug: true,
        cards: {
          where: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            title: true,
            assets: {
              where: { contentStatus: "PUBLISHED", isOnline: true, deletedAt: null },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
              select: { title: true, assetType: true },
            },
          },
        },
      },
    });
    expect(content.modules.map((module) => module.title)).toEqual(expectedModules.map((module) => module.title));
    expect(content.modules.flatMap((module) => module.cards).map((card) => card.title)).not.toEqual(
      expect.arrayContaining(["草稿卡片", "已删除卡片"]),
    );
    for (const expectedModule of expectedModules) {
      const actualModule = content.modules.find((module) => module.slug === expectedModule.slug);
      expect(actualModule?.cards.map((card) => card.title)).toEqual(expectedModule.cards.map((card) => card.title));
      expect(actualModule?.cards.map((card) => card.assets.map((asset) => ({ title: asset.title, type: asset.type })))).toEqual(
        expectedModule.cards.map((card) => card.assets.map((asset) => ({ title: asset.title, type: asset.assetType }))),
      );
    }
  });

  it("does not expose internal records, storage keys, or secrets", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("seed-admin@local.invalid");
    expect(serialized).not.toContain("S3_SECRET_ACCESS_KEY");
    expect(body.modules.map((module: { id: string }) => module.id)).toEqual(
      expect.arrayContaining([
        "seed-module-inspection",
        "seed-module-review",
        "seed-module-traceability",
      ]),
    );
  });
});
