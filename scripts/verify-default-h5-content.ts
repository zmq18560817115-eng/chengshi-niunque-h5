import { PrismaClient } from "@prisma/client";
import { DEFAULT_H5_CONTENT } from "../src/config/default-h5-content";
import { PublicContentService } from "../src/server/services/public-content-service";

const prisma = new PrismaClient();

async function main() {
  const expectedCards = DEFAULT_H5_CONTENT.flatMap((module) => module.cards.map((card) => card.id));
  const modules = await prisma.informationModule.findMany({
    where: { id: { in: DEFAULT_H5_CONTENT.map((module) => module.id) } },
    select: { id: true, slug: true, contentStatus: true, isOnline: true, cards: { select: { id: true, contentStatus: true, isOnline: true, deletedAt: true } } },
  });
  const failures: string[] = [];

  for (const expected of DEFAULT_H5_CONTENT) {
    const categoryRecord = modules.find((item) => item.id === expected.id && item.slug === expected.slug);
    if (!categoryRecord) { failures.push(`缺少分类 ${expected.slug}`); continue; }
    if (categoryRecord.contentStatus !== "PUBLISHED" || !categoryRecord.isOnline) failures.push(`分类未上线 ${expected.slug}`);
    for (const card of expected.cards) {
      const current = categoryRecord.cards.find((item) => item.id === card.id);
      if (!current) { failures.push(`缺少卡片 ${card.id}`); continue; }
      if (current.deletedAt || current.contentStatus !== "PUBLISHED" || !current.isOnline) failures.push(`卡片未上线 ${card.id}`);
    }
  }

  const publicContent = await new PublicContentService().getContent();
  for (const expected of DEFAULT_H5_CONTENT) {
    const publicCategory = publicContent.modules.find((item) => item.slug === expected.slug);
    if (!publicCategory) { failures.push(`前台不可访问分类 ${expected.slug}`); continue; }
    for (const card of expected.cards) if (!publicCategory.cards.some((item) => item.id === card.id)) failures.push(`前台不可访问卡片 ${card.id}`);
  }

  if (failures.length) throw new Error(`默认前后台内容校验失败：${failures.join("；")}`);
  console.log(JSON.stringify({ status: "ready", modules: DEFAULT_H5_CONTENT.length, cards: expectedCards.length, publicContent: "ok" }));
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : "Default content verification failed"); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
