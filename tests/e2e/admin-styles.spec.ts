import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

function localEnv(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = (existsSync(".env") ? readFileSync(".env", "utf8") : "")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing local environment variable: ${name}`);
  return line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

test("production pages apply the shared H5 and admin styles", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/reports");
  await expect(page.locator(".h5-shell")).toHaveCSS("max-width", "750px");
  await expect(page.locator(".h5-shell")).not.toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );

  await page.goto("/admin/login");
  const login = page.locator(".admin-login");
  const form = page.locator(".admin-login .admin-form");
  const submitButton = page.locator(".admin-login button");
  await expect(login).toHaveCSS("max-width", "448px");
  await expect(login).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(form).toHaveCSS("display", "grid");
  await expect(submitButton).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const account = page.locator("input[name='account']");
  const password = page.locator("input[name='password']");
  await expect(account).toBeVisible();
  await expect(password).toBeVisible();
  await expect(account).toHaveAttribute("type", "text");
  const emailBox = await account.boundingBox();
  const passwordBox = await password.boundingBox();
  expect(emailBox && passwordBox && passwordBox.y > emailBox.y + emailBox.height).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  const mobileBox = await page.locator(".admin-login").boundingBox();
  expect(mobileBox && mobileBox.width <= 390 && mobileBox.x >= 0).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 800 });

  await account.fill(localEnv("ADMIN_SEED_USERNAME"));
  await password.fill(localEnv("ADMIN_SEED_PASSWORD"));
  await submitButton.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "批次与报告图片管理" })).toBeVisible();
  await expect(page.locator('#latest-batch input:not([type="hidden"])')).toHaveCount(3);
  await expect(page.locator(".managed-report-card")).toHaveCount(8);
  await expect(page.locator("#report-images h3")).toHaveText(["检测项目", "复核保障", "生产溯源"]);
  await expect(page.locator('input[name="title"], textarea, select')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("admin-desktop.png"), fullPage: true });
  await page.getByText("安全底线", { exact: true }).click();
  const card = page.locator("#report-seed-card-inspection-safety");
  await expect(card.getByRole("link", { name: /查看前端对应页面/ })).toHaveAttribute("href", "/reports/inspection-projects/items/seed-card-inspection-safety/reports");
  await expect(card.getByLabel("选择报告图片", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "上传并发布" })).toBeDisabled();
  await card.getByLabel("选择报告图片", { exact: true }).setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPz8AAAAASUVORK5CYII=", "base64") },
    { name: "second.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPz8AAAAASUVORK5CYII=", "base64") },
  ]);
  await expect(card.locator(".report-image-selection li")).toHaveCount(2);
  await card.getByRole("button", { name: "第 2 页上移" }).click();
  await expect(card.locator(".report-image-selection li").first()).toContainText("second.png");
  await card.getByRole("button", { name: "移除待上传第 1 页" }).click();
  await expect(card.locator(".report-image-selection li")).toHaveCount(1);
  await expect(card.getByRole("button", { name: "上传并发布" })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(card.getByLabel("选择报告图片", { exact: true })).toBeVisible();
  // Navigation checks do not submit the temporary images or edit live content.
  await page.locator("#report-images").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("admin-mobile.png"), fullPage: true });
  for (const path of ["/admin/modules", "/admin/modules/seed-module-inspection", "/admin/cards/seed-card-inspection-safety", "/admin/site", "/admin/preview/seed-module-inspection"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin(?:#.*)?$/);
    await expect(page.getByRole("heading", { name: "批次与报告图片管理" })).toBeVisible();
  }
});
