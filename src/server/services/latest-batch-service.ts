import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { isBatchCode, isInspectionDate, latestBatchSettingKey, resolveLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";

export function validateLatestBatch(raw: Record<string, unknown>): LatestBatch {
  const regularBatch = String(raw.regularBatch ?? "").trim();
  const trialBatch = String(raw.trialBatch ?? "").trim();
  const inspectionDate = String(raw.inspectionDate ?? "").trim();
  if (!isBatchCode(regularBatch)) throw new Error("正装批次号请填写 1–24 位字母、数字或 . _ / -，并以字母或数字开头。");
  if (!isBatchCode(trialBatch)) throw new Error("试用装批次号请填写 1–24 位字母、数字或 . _ / -，并以字母或数字开头。");
  if (!isInspectionDate(inspectionDate)) throw new Error("检测日期请填写有效的 YYYY-MM 或 YYYY-MM-DD，例如 2026-08 或 2026-08-15。");
  return { regularBatch, trialBatch, inspectionDate };
}

export class LatestBatchService {
  constructor(private readonly client: PrismaClient = prisma) {}
  async get(): Promise<LatestBatch> {
    const item = await this.client.siteSetting.findUnique({ where: { key: latestBatchSettingKey } });
    return resolveLatestBatch(item?.deletedAt ? null : item?.value);
  }
  async publish(raw: Record<string, unknown>, adminId: string): Promise<LatestBatch> {
    const value = validateLatestBatch(raw);
    await this.client.$transaction(async (tx) => {
      const before = await tx.siteSetting.findUnique({ where: { key: latestBatchSettingKey } });
      const data = { name: "最新公开批次", value, contentStatus: "PUBLISHED" as const, isOnline: true, publishedAt: new Date(), offlineAt: null, deletedAt: null, updatedById: adminId };
      const item = await tx.siteSetting.upsert({ where: { key: latestBatchSettingKey }, create: { ...data, key: latestBatchSettingKey, createdById: adminId }, update: data });
      await tx.auditLog.create({ data: { operatorId: adminId, action: "LATEST_BATCH_PUBLISH", targetType: "SiteSetting", targetId: item.id, detail: { before: resolveLatestBatch(before?.value), after: value } } });
    });
    return value;
  }
}
