import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { createSessionToken, digestSessionToken, ADMIN_SESSION_COOKIE } from "../src/server/auth/token";
import { latestBatchSettingKey } from "../src/config/h5-latest-batch";

async function main() {
  const baseURL = "http://127.0.0.1:3100";
  const output = "artifacts/latest-batch-qa";
  await mkdir(output, { recursive: true });
  const prisma = new PrismaClient();
  const before = await prisma.siteSetting.findUnique({ where: { key: latestBatchSettingKey } });
  const admin = await prisma.adminUser.create({ data: { email: `batch-qa-${Date.now()}@example.invalid`, displayName: "公开批次验证", passwordHash: "qa-session-only" } });
  const token = createSessionToken();
  await prisma.adminSession.create({ data: { adminId: admin.id, tokenDigest: digestSessionToken(token), expiresAt: new Date(Date.now() + 600000) } });
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const checks: string[] = [];
  try {
    const publicContext = await browser.newContext({ baseURL, viewport: { width: 750, height: 1400 }, reducedMotion: "reduce" });
    const publicPage = await publicContext.newPage();
    await publicPage.goto("/admin/site");
    await expect(publicPage).toHaveURL(/\/admin\/login/);
    checks.push("anonymous admin access denied");
    await publicPage.goto("/reports");
    await expect(publicPage.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true");
    await publicPage.screenshot({ path: `${output}/after-default.png`, animations: "disabled" });
    const adminContext = await browser.newContext({ baseURL, viewport: { width: 1100, height: 900 } });
    await adminContext.addCookies([{ name: ADMIN_SESSION_COOKIE, value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
    const page = await adminContext.newPage();
    await page.goto("/admin/site");
    await expect(page.getByRole("heading", { name: "最新公开批次", exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/admin-initial.png` });
    await page.locator('[name="inspectionDate"]').fill("2026-02-30");
    await page.getByRole("button", { name: "保存并发布" }).click();
    await expect(page.locator('.admin-form [role="alert"]')).toContainText("有效");
    await expect(page.locator('[name="inspectionDate"]')).toHaveValue("2026-02-30");
    assert.deepEqual(await prisma.siteSetting.findUnique({ where: { key: latestBatchSettingKey } }), before);
    checks.push("invalid calendar date rejected without publishing or losing draft");
    let releaseImage!: () => void;
    let imageRequested = false;
    const imageGate = new Promise<void>((resolve) => { releaseImage = resolve; });
    await publicPage.route("**/archive-batch-editable.webp", async (route) => { imageRequested = true; await imageGate; await route.continue(); });
    const value = { regularBatch: "GD00049001", trialBatch: "GD00049002", inspectionDate: "2026-09-07" };
    for (const [name, text] of Object.entries(value)) await page.locator(`[name="${name}"]`).fill(text);
    await page.getByRole("button", { name: "保存并发布" }).click();
    await expect(page.getByRole("status")).toContainText("已保存并发布");
    await page.reload();
    for (const [name, text] of Object.entries(value)) await expect(page.locator(`[name="${name}"]`)).toHaveValue(text);
    const published = await prisma.siteSetting.findUniqueOrThrow({ where: { key: latestBatchSettingKey } });
    assert.deepEqual(published.value, value);
    assert.equal(await prisma.auditLog.count({ where: { operatorId: admin.id, action: "LATEST_BATCH_PUBLISH" } }), 1);
    checks.push("authenticated publication persists and writes audit log");
    await publicPage.bringToFront();
    await publicPage.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => imageRequested).toBe(true);
    await expect(publicPage.locator('.reports-archive-entry-batch [data-batch-field]')).toHaveCount(0);
    await expect(publicPage.locator('.reports-archive-entry-batch img')).toHaveAttribute("src", /archive-1-batch-module/);
    releaseImage();
    checks.push("slow replacement asset keeps old artwork intact until atomic update");
    const regular = publicPage.locator('.reports-archive-entry-batch [data-batch-field="regularBatch"]');
    await expect(regular).toHaveText(value.regularBatch, { timeout: 15000 });
    await expect(publicPage.locator('.reports-archive-entry-batch [data-batch-field="inspectionDate"]')).toHaveText("2026年9月7日");
    checks.push("already open homepage refreshes published fields");
    await publicPage.locator('.reports-archive-entry-batch img').evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
    await publicPage.screenshot({ path: `${output}/custom-750.png`, animations: "disabled" });
    for (const width of [320, 375, 430, 750]) {
      await publicPage.setViewportSize({ width, height: 1400 });
      const bounds = await publicPage.locator('.reports-archive-entry-batch [data-batch-field]').evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width }; }));
      assert.equal(bounds.length, 3);
      assert.ok(bounds.every((box) => box.left >= 0 && box.right <= width && box.width > 0));
    }
    checks.push("all three fields fit at 320, 375, 430 and 750 widths");
    await publicPage.goto("/go");
    await expect(publicPage.locator('.brand-guide-destination-preview [data-batch-field="regularBatch"]')).toHaveText(value.regularBatch);
    await expect(publicPage.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 20000 });
    await publicPage.getByRole("button", { name: "进入档案" }).click();
    await expect(publicPage).toHaveURL(/\/reports$/, { timeout: 15000 });
    await expect(regular).toHaveText(value.regularBatch);
    checks.push("guide preview and route handoff preserve new batch values");
    const fallbackPage = await publicContext.newPage();
    await fallbackPage.route("**/archive-batch-editable.webp", (route) => route.abort());
    await fallbackPage.goto("/reports");
    await expect(fallbackPage.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-failed", "true", { timeout: 20000 });
    await expect(fallbackPage.locator('.reports-archive-reference-fallback [data-batch-field="regularBatch"]')).toHaveText(value.regularBatch);
    await expect(fallbackPage.locator(".reports-archive-reference-fallback-image")).toHaveAttribute("src", /archive-reference-editable/);
    await fallbackPage.screenshot({ path: `${output}/custom-fallback.png`, animations: "disabled" });
    checks.push("image failure fallback displays published batch values");
  } finally {
    await browser.close();
    await prisma.$transaction(async (tx) => {
      const current = await tx.siteSetting.findUnique({ where: { key: latestBatchSettingKey } });
      if (current?.updatedById === admin.id) {
        if (before) {
          const { id, ...data } = before;
          await tx.siteSetting.update({ where: { id }, data: { ...data, value: before.value as Prisma.InputJsonValue } });
        } else {
          await tx.siteSetting.delete({ where: { id: current.id } });
        }
      }
      await tx.auditLog.deleteMany({ where: { operatorId: admin.id } });
      await tx.adminSession.deleteMany({ where: { adminId: admin.id } });
      await tx.adminUser.delete({ where: { id: admin.id } });
    });
    await prisma.$disconnect();
  }
  await writeFile(`${output}/checks.json`, JSON.stringify({ checks, temporaryDataRestored: true }, null, 2));
  console.log(JSON.stringify({ checks, temporaryDataRestored: true }));
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
