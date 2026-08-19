import { PrismaClient, type Prisma } from "@prisma/client";
import {
  ACCEPTANCE_PLACEHOLDER_ASSET_IDS,
  DEFAULT_H5_CONTENT,
  LEGACY_UNCERTAIN_CARD_IDS,
} from "../src/config/default-h5-content";

const prisma = new PrismaClient();
const seedOperatorId = "seed-admin-content-owner";
const publishShell = process.argv.includes("--publish-shell");
const repairPublishedShell = process.argv.includes("--repair-published-shell");

type Tx = Prisma.TransactionClient;

async function audit(tx: Tx, action: string, targetType: string, targetId: string, detail: Prisma.InputJsonValue) {
  await tx.auditLog.create({ data: { operatorId: seedOperatorId, action, targetType, targetId, detail } });
}

async function ensureSeedOperator() {
  await prisma.adminUser.upsert({
    where: { id: seedOperatorId },
    update: {},
    create: {
      id: seedOperatorId,
      email: "seed-admin@local.invalid",
      displayName: "本地内容初始化账号",
      passwordHash: "disabled-local-seed-account-no-login",
      status: "ACTIVE",
    },
  });
}

async function seedDefaults() {
  await ensureSeedOperator();
  const summary = { publishShell, repairPublishedShell, modulesCreated: 0, modulesAligned: 0, modulesPublished: 0, cardsCreated: 0, cardsAligned: 0, cardsPublished: 0, legacyCardsOfflined: 0, placeholdersOfflined: 0, incompleteCardsDrafted: 0 };
  const initialLifecycle = publishShell
    ? { contentStatus: "PUBLISHED" as const, isOnline: true }
    : { contentStatus: "DRAFT" as const, isOnline: false };

  await prisma.$transaction(async (tx) => {
    for (const category of DEFAULT_H5_CONTENT) {
      const existing = await tx.informationModule.findUnique({ where: { slug: category.slug } });
      if (!existing) {
        await tx.informationModule.create({ data: {
          id: category.id, slug: category.slug, title: category.title, description: category.description,
          sortOrder: category.sortOrder, ...initialLifecycle,
          createdById: seedOperatorId, updatedById: seedOperatorId,
        } });
        await audit(tx, "CONTENT_DEFAULT_MODULE_CREATE", "InformationModule", category.id, { seedKey: category.slug });
        summary.modulesCreated += 1;
      } else if (existing.id === category.id) {
        const safeOrderUpdate = existing.sortOrder !== category.sortOrder;
        const safeLifecycleUpdate = publishShell && existing.contentStatus === "DRAFT" && !existing.isOnline && (repairPublishedShell || (existing.createdById === seedOperatorId && existing.updatedById === seedOperatorId));
        if (safeOrderUpdate || safeLifecycleUpdate) {
          await tx.informationModule.update({ where: { id: existing.id }, data: { ...(safeOrderUpdate ? { sortOrder: category.sortOrder } : {}), ...(safeLifecycleUpdate ? initialLifecycle : {}), updatedById: seedOperatorId } });
          await audit(tx, safeLifecycleUpdate ? "CONTENT_DEFAULT_MODULE_PUBLISH" : "CONTENT_DEFAULT_MODULE_ORDER", "InformationModule", existing.id, { before: existing.sortOrder, after: category.sortOrder, lifecyclePublished: safeLifecycleUpdate });
          if (safeOrderUpdate) summary.modulesAligned += 1;
          if (safeLifecycleUpdate) summary.modulesPublished += 1;
        }
      }

      const moduleId = existing?.id ?? category.id;
      for (const card of category.cards) {
        const current = await tx.reportCard.findUnique({ where: { id: card.id } });
        if (!current) {
          await tx.reportCard.create({ data: {
            id: card.id, moduleId, title: card.title, description: card.description,
            buttonText: "查看报告", sortOrder: card.sortOrder, ...initialLifecycle,
            createdById: seedOperatorId, updatedById: seedOperatorId,
          } });
          await audit(tx, "CONTENT_DEFAULT_CARD_CREATE", "ReportCard", card.id, { category: category.slug, seedTitle: card.title });
          summary.cardsCreated += 1;
          continue;
        }

        const legacyTitle = "legacyTitle" in card ? card.legacyTitle : undefined;
        const safeTitleUpdate = legacyTitle && current.title === legacyTitle;
        const safeOrderUpdate = current.moduleId === moduleId && current.sortOrder !== card.sortOrder;
        const safeLifecycleUpdate = publishShell && current.contentStatus === "DRAFT" && !current.isOnline && (repairPublishedShell || (current.createdById === seedOperatorId && current.updatedById === seedOperatorId));
        if (safeTitleUpdate || safeOrderUpdate || safeLifecycleUpdate) {
          await tx.reportCard.update({ where: { id: current.id }, data: {
            ...(safeTitleUpdate ? { title: card.title, description: card.description } : {}),
            ...(safeOrderUpdate ? { sortOrder: card.sortOrder } : {}),
            ...(safeLifecycleUpdate ? initialLifecycle : {}),
            updatedById: seedOperatorId,
          } });
          await audit(tx, safeLifecycleUpdate ? "CONTENT_DEFAULT_CARD_PUBLISH" : "CONTENT_DEFAULT_CARD_ALIGN", "ReportCard", current.id, {
            category: category.slug, titleChanged: Boolean(safeTitleUpdate), orderChanged: safeOrderUpdate, lifecyclePublished: safeLifecycleUpdate,
          });
          if (safeTitleUpdate || safeOrderUpdate) summary.cardsAligned += 1;
          if (safeLifecycleUpdate) summary.cardsPublished += 1;
        }
      }
    }

    for (const id of LEGACY_UNCERTAIN_CARD_IDS) {
      const card = await tx.reportCard.findUnique({ where: { id } });
      if (!card || card.contentStatus === "OFFLINE") continue;
      await tx.reportCard.update({ where: { id }, data: { contentStatus: "OFFLINE", isOnline: false, offlineAt: new Date(), updatedById: seedOperatorId } });
      await tx.reportAsset.updateMany({ where: { reportCardId: id, deletedAt: null }, data: { contentStatus: "OFFLINE", isOnline: false, offlineAt: new Date(), updatedById: seedOperatorId } });
      await audit(tx, "CONTENT_LEGACY_CARD_OFFLINE", "ReportCard", id, { reason: "旧卡片与正式设计结构及资料归属无法可靠对应" });
      summary.legacyCardsOfflined += 1;
    }

    for (const id of ACCEPTANCE_PLACEHOLDER_ASSET_IDS) {
      const asset = await tx.reportAsset.findUnique({ where: { id } });
      if (!asset || asset.contentStatus === "OFFLINE") continue;
      await tx.reportAsset.update({ where: { id }, data: { contentStatus: "OFFLINE", isOnline: false, offlineAt: new Date(), updatedById: seedOperatorId } });
      await audit(tx, "CONTENT_ACCEPTANCE_ASSET_OFFLINE", "ReportAsset", id, { reason: "联调占位资料不得进入正式公开内容" });
      summary.placeholdersOfflined += 1;
    }

    for (const category of DEFAULT_H5_CONTENT) {
      if (publishShell) continue;
      for (const definition of category.cards) {
        const card = await tx.reportCard.findUnique({ where: { id: definition.id }, include: { assets: { where: { deletedAt: null, contentStatus: "PUBLISHED", isOnline: true } } } });
        if (!card || card.contentStatus !== "PUBLISHED" || card.assets.length > 0) continue;
        await tx.reportCard.update({ where: { id: card.id }, data: { contentStatus: "DRAFT", isOnline: false, updatedById: seedOperatorId } });
        await audit(tx, "CONTENT_INCOMPLETE_CARD_DRAFT", "ReportCard", card.id, { reason: "正式卡片没有可公开的已发布资料" });
        summary.incompleteCardsDrafted += 1;
      }
    }
  });

  console.log(JSON.stringify(summary, null, 2));
}

seedDefaults()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
