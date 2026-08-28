import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adminId = "seed-admin-content-owner";
const publishedAt = new Date("2026-08-01T00:00:00.000Z");
const deletedAt = new Date("2026-08-02T00:00:00.000Z");

const publishedModules = [
  {
    id: "seed-module-inspection",
    slug: "inspection-projects",
    title: "检测项目",
    description: "展示产品检测项目与对应报告资料。",
    sortOrder: 10,
    cards: [
      { id: "seed-card-inspection-nutrition", title: "营养成分检测", description: "核心营养成分检测结果。", sortOrder: 10 },
      { id: "seed-card-inspection-safety", title: "安全指标检测", description: "安全与卫生指标检测结果。", sortOrder: 20 },
    ],
  },
  {
    id: "seed-module-review",
    slug: "review-assurance",
    title: "复核保障",
    description: "展示检测结果的复核流程与质量保障。",
    sortOrder: 20,
    cards: [
      { id: "seed-card-review-process", title: "复核流程", description: "检测数据的复核流程说明。", sortOrder: 10 },
      { id: "seed-card-review-standard", title: "质量标准", description: "复核采用的质量标准与记录。", sortOrder: 20 },
    ],
  },
  {
    id: "seed-module-traceability",
    slug: "production-traceability",
    title: "生产溯源",
    description: "展示从原料到生产批次的溯源资料。",
    sortOrder: 30,
    cards: [
      { id: "seed-card-traceability-origin", title: "原料溯源", description: "原料来源与批次信息。", sortOrder: 10 },
      { id: "seed-card-traceability-production", title: "生产记录", description: "生产过程与批次记录。", sortOrder: 20 },
    ],
  },
];

const retiredAssetIds = [
  "seed-asset-card-link",
  "seed-asset-pdf",
  "seed-asset-image",
  "seed-asset-link",
];

async function seed() {
  await prisma.adminUser.upsert({
    where: { id: adminId },
    update: { displayName: "本地数据维护员", status: "ACTIVE", deletedAt: null },
    create: {
      id: adminId,
      email: "seed-admin@local.invalid",
      displayName: "本地数据维护员",
      passwordHash: "disabled-local-seed-account-no-login",
      status: "ACTIVE",
    },
  });

  for (const moduleSeed of publishedModules) {
    const { cards, ...moduleData } = moduleSeed;
    await prisma.informationModule.upsert({
      where: { id: moduleData.id },
      update: {
        ...moduleData,
        contentStatus: "PUBLISHED",
        isOnline: true,
        publishedAt,
        offlineAt: null,
        deletedAt: null,
        updatedById: adminId,
      },
      create: {
        ...moduleData,
        contentStatus: "PUBLISHED",
        isOnline: true,
        publishedAt,
        createdById: adminId,
        updatedById: adminId,
      },
    });

    for (const card of cards) {
      await prisma.reportCard.upsert({
        where: { id: card.id },
        update: {
          ...card,
          moduleId: moduleData.id,
          contentStatus: "PUBLISHED",
          isOnline: true,
          publishedAt,
          offlineAt: null,
          deletedAt: null,
          updatedById: adminId,
        },
        create: {
          ...card,
          moduleId: moduleData.id,
          contentStatus: "PUBLISHED",
          isOnline: true,
          publishedAt,
          createdById: adminId,
          updatedById: adminId,
        },
      });
    }
  }

  await prisma.reportAsset.updateMany({
    where: { id: { in: retiredAssetIds } },
    data: {
      contentStatus: "OFFLINE",
      isOnline: false,
      offlineAt: deletedAt,
      deletedAt,
      updatedById: adminId,
    },
  });

  const hiddenModules = [
    { id: "seed-module-draft", slug: "draft-content", title: "草稿模块", contentStatus: "DRAFT", isOnline: false, deletedAt: null, sortOrder: 40 },
    { id: "seed-module-offline", slug: "offline-content", title: "下线模块", contentStatus: "OFFLINE", isOnline: false, deletedAt: null, sortOrder: 50 },
    { id: "seed-module-deleted", slug: "deleted-content", title: "已删除模块", contentStatus: "PUBLISHED", isOnline: true, deletedAt, sortOrder: 60 },
  ];

  for (const item of hiddenModules) {
    await prisma.informationModule.upsert({
      where: { id: item.id },
      update: { ...item, description: "公开接口过滤验证样本。", updatedById: adminId },
      create: {
        ...item,
        description: "公开接口过滤验证样本。",
        publishedAt: item.contentStatus === "PUBLISHED" ? publishedAt : null,
        offlineAt: item.contentStatus === "OFFLINE" ? publishedAt : null,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  const hiddenCards = [
    { id: "seed-card-draft", title: "草稿卡片", contentStatus: "DRAFT", isOnline: false, deletedAt: null, sortOrder: 90 },
    { id: "seed-card-deleted", title: "已删除卡片", contentStatus: "PUBLISHED", isOnline: true, deletedAt, sortOrder: 100 },
  ];

  for (const item of hiddenCards) {
    await prisma.reportCard.upsert({
      where: { id: item.id },
      update: { ...item, moduleId: "seed-module-inspection", updatedById: adminId },
      create: {
        ...item,
        moduleId: "seed-module-inspection",
        description: "嵌套公开过滤验证样本。",
        publishedAt: item.contentStatus === "PUBLISHED" ? publishedAt : null,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: "public-site" },
    update: {
      name: "公开站点基础设置",
      description: "H5 当前阶段基础配置。",
      value: { siteName: "诚实营养报告", locale: "zh-CN" },
      sortOrder: 10,
      contentStatus: "PUBLISHED",
      isOnline: true,
      publishedAt,
      deletedAt: null,
      updatedById: adminId,
    },
    create: {
      key: "public-site",
      name: "公开站点基础设置",
      description: "H5 当前阶段基础配置。",
      value: { siteName: "诚实营养报告", locale: "zh-CN" },
      sortOrder: 10,
      contentStatus: "PUBLISHED",
      isOnline: true,
      publishedAt,
      createdById: adminId,
      updatedById: adminId,
    },
  });

  await prisma.publishVersion.upsert({
    where: { versionNumber: 1 },
    update: { status: "PUBLISHED", snapshot: { moduleSlugs: publishedModules.map((item) => item.slug) }, publishedAt, publishedById: adminId },
    create: { versionNumber: 1, status: "PUBLISHED", snapshot: { moduleSlugs: publishedModules.map((item) => item.slug) }, publishedAt, publishedById: adminId },
  });

  if ((await prisma.auditLog.count({ where: { id: "seed-audit-publish" } })) === 0) {
    await prisma.auditLog.create({
      data: { id: "seed-audit-publish", operatorId: adminId, action: "SEED_PUBLISH", targetType: "PublishVersion", targetId: "1", detail: { localSeed: true } },
    });
  }

  const [admins, modules, cards, assets, settings, versions, auditLogs] = await Promise.all([
    prisma.adminUser.count(),
    prisma.informationModule.count(),
    prisma.reportCard.count(),
    prisma.reportAsset.count(),
    prisma.siteSetting.count(),
    prisma.publishVersion.count(),
    prisma.auditLog.count(),
  ]);

  console.log(JSON.stringify({ admins, modules, cards, assets, settings, versions, auditLogs }));
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
