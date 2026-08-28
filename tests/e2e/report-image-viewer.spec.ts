import { expect, test } from "@playwright/test";

test.use({ browserName: "chromium" });

const reservedPlaceholderPages = [
  "/reports/inspection-projects/items/placeholder-slot-1/reports",
  "/reports/inspection-projects/items/placeholder-slot-2/reports",
  "/reports/inspection-projects/items/placeholder-slot-3/reports",
  "/reports/review-assurance/items/placeholder-slot-1/reports",
  "/reports/review-assurance/items/placeholder-slot-2/reports",
  "/reports/review-assurance/items/placeholder-slot-3/reports",
  "/reports/production-traceability/items/placeholder-slot-1/reports",
  "/reports/production-traceability/items/placeholder-slot-2/reports",
] as const;

test("all former public placeholder report slots return 404", async ({ page }) => {
  for (const path of reservedPlaceholderPages) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(404);
    await expect(page.locator(".image-report")).toHaveCount(0);
  }
});

test("a published image report zooms inside its viewer without widening the page", async ({ page, request }) => {
  const response = await request.get("/api/public/content");
  expect(response.ok()).toBeTruthy();
  const content = await response.json() as {
    modules: Array<{ slug: string; cards: Array<{ id: string; assets: Array<{ type: string }> }> }>;
  };
  const target = content.modules.flatMap((module) => module.cards.map((card) => ({ module, card })))
    .find(({ card }) => card.assets.some((asset) => asset.type === "IMAGE"));
  test.skip(!target, "No published image report is available in this environment.");
  if (!target) return;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/reports/${target.module.slug}/items/${target.card.id}/reports`);
  const stage = page.locator(".report-image-stage").first();
  const image = stage.getByRole("img");
  await expect(stage).toBeVisible();
  await expect(image).toBeVisible();
  await expect(page.locator(".report-file-card")).toHaveCount(0);

  const before = await stage.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  await page.getByRole("button", { name: "放大报告图片" }).first().click();
  await expect(stage).toHaveClass(/is-zoomed/);
  await expect(image).toHaveAttribute("style", /width: 125%/);
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(before.pageWidth);
  expect(before.pageWidth).toBe(before.viewportWidth);
});
