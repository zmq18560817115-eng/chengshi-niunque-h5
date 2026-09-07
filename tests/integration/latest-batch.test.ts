import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { LatestBatchService } from "@/server/services/latest-batch-service";
import { PublicContentRepository } from "@/server/repositories/public-content-repository";
import { PublicContentService, publicSiteConfig } from "@/server/services/public-content-service";
import { latestBatchSettingKey } from "@/config/h5-latest-batch";

it("publishes batch fields atomically with an audit entry and a new public content version", async () => {
  const rollback = new Error("rollback isolated batch test");
  await expect(prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.findFirstOrThrow({ where: { status: "ACTIVE", deletedAt: null } });
    const scoped = { ...tx, $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient;
    const service = new LatestBatchService(scoped);
    const publicService = new PublicContentService(new PublicContentRepository(tx as unknown as PrismaClient));
    const before = await publicService.getContent();
    const value = { regularBatch: "QA2026090701", trialBatch: "QA2026090702", inspectionDate: "2026-09-07" };
    await service.publish(value, admin.id);
    expect(await service.get()).toEqual(value);
    const after = await publicService.getContent();
    expect(after.version).not.toBe(before.version);
    expect(publicSiteConfig(after).latestBatch).toEqual(value);
    const item = await tx.siteSetting.findUniqueOrThrow({ where: { key: latestBatchSettingKey } });
    expect(await tx.auditLog.findFirst({ where: { targetId: item.id, action: "LATEST_BATCH_PUBLISH" }, orderBy: { createdAt: "desc" } })).toMatchObject({ operatorId: admin.id, detail: { after: value } });
    await expect(service.publish({ ...value, inspectionDate: "2026-02-30" }, admin.id)).rejects.toThrow(/检测日期/);
    expect(await service.get()).toEqual(value);
    await tx.siteSetting.update({ where: { id: item.id }, data: { isOnline: false } });
    expect((await publicService.getContent()).settings.some((setting) => setting.key === latestBatchSettingKey)).toBe(false);
    throw rollback;
  })).rejects.toBe(rollback);
});
