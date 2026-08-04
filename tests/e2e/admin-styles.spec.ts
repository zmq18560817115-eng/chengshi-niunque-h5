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
  await expect(page.locator(".admin-form")).toHaveCSS("display", "grid");
});
