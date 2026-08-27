import { expect, test } from "@playwright/test";
test("public and admin shells respond", async ({ page }) => {
  await page.goto("/go");
  await expect(page.getByRole("region", { name: "品牌引导页" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
});

test("health responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok" });
});
