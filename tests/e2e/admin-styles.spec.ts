import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

function localEnv(name: string): string {
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing local environment variable: ${name}`);
  return line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

test("production pages apply the shared H5 and admin styles", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".h5-shell")).toHaveCSS("max-width", "430px");
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

  const email = page.locator("input[name='email']");
  const password = page.locator("input[name='password']");
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  const emailBox = await email.boundingBox();
  const passwordBox = await password.boundingBox();
  expect(emailBox && passwordBox && passwordBox.y > emailBox.y + emailBox.height).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  const mobileBox = await page.locator(".admin-login").boundingBox();
  expect(mobileBox && mobileBox.width <= 390 && mobileBox.x >= 0).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 800 });

  await email.fill(localEnv("ADMIN_SEED_EMAIL"));
  await password.fill(localEnv("ADMIN_SEED_PASSWORD"));
  await submitButton.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-grid")).toHaveCSS("display", "grid");

  await page.goto("/admin/modules");
  await expect(page.locator(".admin-shell")).toBeVisible();
  await expect(page.locator(".module-table")).toBeVisible();
  await page.locator("a.button-primary", { hasText: "编辑内容" }).first().click();
  await expect(page.locator(".workspace")).toHaveCSS("display", "grid");
  await expect(page.locator(".workspace-tree")).toBeVisible();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  await expect(page.locator(".phone-frame")).toHaveCount(0);
  await expect(page.getByText("编辑预览，尚未发布").first()).toBeVisible();

  await page.locator(".tree-list > li > button").first().click();
  await expect(page.locator(".report-card.preview-focus")).toBeVisible();
  await page.locator(".tree-module").click();

  await page.getByRole("tab", { name: "完整页面" }).click();
  const fullPreview = page.getByRole("dialog", { name: "完整页面预览" });
  await expect(fullPreview).toBeVisible();
  for (const width of [375, 390, 414]) {
    await fullPreview.getByRole("button", { name: String(width), exact: true }).click();
    const device = fullPreview.locator(".full-preview-device");
    await expect(device).toHaveAttribute("data-device-width", String(width));
    expect(await device.evaluate((element) => Number.parseFloat(getComputedStyle(element).width))).toBe(width);
  }
  await fullPreview.getByRole("button", { name: "100%" }).click();
  await expect(fullPreview.locator(".full-preview-device")).toHaveAttribute("data-scale-mode", "actual");
  await fullPreview.getByRole("button", { name: "适应区域" }).click();
  const stageScrolls = await fullPreview.locator(".full-preview-stage").evaluate((element) => element.scrollHeight > element.clientHeight);
  expect(stageScrolls).toBe(true);
  await fullPreview.getByRole("button", { name: "关闭完整页面预览" }).click();

  await page.getByRole("button", { name: "发布", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("发布前检查")).toBeVisible();
  await page.getByRole("button", { name: "返回修改" }).click();

  const moduleTitle = page.locator("#module-editor input[name='title']");
  await moduleTitle.fill(`${await moduleTitle.inputValue()} 临时预览`);
  await expect(page.getByText("存在未保存修改").last()).toBeVisible();
  let warned = false;
  page.once("dialog", async (dialog) => { warned = true; await dialog.dismiss(); });
  await page.getByRole("link", { name: "退出编辑" }).click();
  expect(warned).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("link", { name: "查看预览" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回编辑内容" })).toBeVisible();
  await page.getByRole("link", { name: "返回编辑内容" }).click();
  await expect(page.locator("#module-editor input[name='title']")).toBeVisible();
});
