import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const devices = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-x-13-mini", width: 375, height: 812 },
  { name: "iphone-12-13-14", width: 390, height: 844 },
  { name: "embedded-browser-short", width: 393, height: 797 },
  { name: "iphone-14-15-pro", width: 393, height: 852 },
  { name: "iphone-plus-pro-max", width: 414, height: 896 },
  { name: "large-android-pro-max", width: 430, height: 932 },
] as const;

const evidenceRoot = "docs/audit-2026-08-18-mobile-user";

test.use({ browserName: "chromium" });

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  width: number,
) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.clientWidth).toBe(width);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(width);
}

async function expectStageFillsSafeContentBox(root: Locator, stage: Locator) {
  const [rootBox, stageBox, padding] = await Promise.all([
    root.boundingBox(),
    stage.boundingBox(),
    root.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        top: Number.parseFloat(style.paddingTop) || 0,
        right: Number.parseFloat(style.paddingRight) || 0,
        bottom: Number.parseFloat(style.paddingBottom) || 0,
        left: Number.parseFloat(style.paddingLeft) || 0,
      };
    }),
  ]);
  expect(rootBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  if (!rootBox || !stageBox) throw new Error("viewport stage has no layout box");
  expect(stageBox.x).toBeCloseTo(rootBox.x + padding.left, 0);
  expect(stageBox.y).toBeCloseTo(rootBox.y + padding.top, 0);
  expect(stageBox.width).toBeCloseTo(rootBox.width - padding.left - padding.right, 0);
  expect(stageBox.height).toBeCloseTo(rootBox.height - padding.top - padding.bottom, 0);
}

for (const device of devices) {
  test(`${device.name} completes guide to archive at ${device.width}x${device.height}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/go");
    await expect(page.getByRole("region", { name: "品牌引导页" })).toBeVisible();
    await expect(page.getByRole("button", { name: "进入档案" })).toBeVisible();
    const guideRoot = page.locator(".brand-guide");
    const guideStage = page.locator(".brand-guide-stage");
    await expectStageFillsSafeContentBox(guideRoot, guideStage);
    await expect(guideStage).toHaveCSS("aspect-ratio", "auto");
    await expect(page.locator(".brand-guide-surround")).toHaveCount(0);
    const fullCanvasLayerStyles = await page.locator([
      ".brand-guide-base",
      ".brand-guide-arch",
      ".brand-guide-paper",
      ".brand-guide-character",
      ".brand-guide-window-mask",
      ".brand-guide-foreground-top",
      ".brand-guide-fallback",
      ".brand-guide-bootstrap-reduced",
    ].join(", ")).evaluateAll((elements) => elements.map((element) => {
      const style = window.getComputedStyle(element);
      return { objectFit: style.objectFit, objectPosition: style.objectPosition };
    }));
    expect(fullCanvasLayerStyles.length).toBeGreaterThan(0);
    for (const style of fullCanvasLayerStyles) {
      expect(style.objectFit).toBe("cover");
      expect(style.objectPosition).toBe("50% 50%");
    }
    await expectNoHorizontalOverflow(page, device.width);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-guide.png` });

    await page.getByRole("button", { name: "进入档案" }).click();
    await page.waitForURL(/\/reports$/);
    await expect(page.locator(".reports-archive-final")).toBeVisible();
    await expect(page.locator(".archive-category-hotspot")).toHaveCount(3);
    await expectNoHorizontalOverflow(page, device.width);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-archive.png` });
    expect(runtimeErrors).toEqual([]);
  });
}

test("375x812 user can open every category and a published report", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  for (const slug of ["inspection-projects", "review-assurance", "production-traceability"] as const) {
    await page.goto(`/reports/${slug}`);
    await expect(page.locator(".category-page-final")).toBeVisible();
    await expect(page.locator(".category-card-hotspot")).not.toHaveCount(0);
    await expectNoHorizontalOverflow(page, 375);
    await page.screenshot({ path: `${evidenceRoot}/flow-${slug}-375x812.png` });
  }

  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.getByRole("heading", { name: "核心营养含量" })).toBeVisible();
  await expect(page.getByText("联调资料-核心营养-保湿机制")).toBeVisible();
  await expectNoHorizontalOverflow(page, 375);
  await page.screenshot({ path: `${evidenceRoot}/flow-published-report-375x812.png` });
  expect(runtimeErrors).toEqual([]);
});

test("guide handoff shows the adaptive buffer until slow homepage artwork is painted", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/final-v1/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4200));
    await route.continue();
  });
  await page.goto("/go");
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(enter).toBeEnabled({ timeout: 5000 });
  await enter.click();
  await page.waitForURL(/\/reports$/);
  const reportsBuffer = page.locator('[data-loading-reason="reports-assets"]');
  await expect(reportsBuffer).toBeVisible({ timeout: 3000 });
  const bufferRoot = reportsBuffer.locator(".guide-loading-buffer");
  const bufferStage = reportsBuffer.locator(".guide-loading-buffer-stage");
  await expectStageFillsSafeContentBox(bufferRoot, bufferStage);
  await expect(bufferStage).toHaveCSS("aspect-ratio", "auto");
  await expect(reportsBuffer.locator(".guide-loading-buffer-poster")).toHaveCSS("object-fit", "cover");
  await expect(reportsBuffer.locator(".guide-loading-buffer-poster")).toHaveCSS("object-position", "50% 50%");
  await expect(reportsBuffer).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator(".reports-archive-final")).toBeVisible();
});
