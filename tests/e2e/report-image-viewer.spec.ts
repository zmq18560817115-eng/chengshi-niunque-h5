import { expect, test } from "@playwright/test";

const reportPages = [
  "/reports/inspection-projects/items/placeholder-slot-3/reports",
  "/reports/review-assurance/items/placeholder-slot-1/reports",
  "/reports/production-traceability/items/placeholder-slot-1/reports",
];

test("all fourth-level report pages zoom inside a fixed viewer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of reportPages) {
    await page.goto(path);
    const stage = page.locator(".report-image-stage").first();
    const image = stage.getByRole("img");
    await expect(stage).toBeVisible();
    await expect(image).toBeVisible();

    const before = await stage.evaluate((element) => ({
      height: element.clientHeight,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    await page.getByRole("button", { name: "放大报告图片" }).first().click();
    await expect(image).toHaveAttribute("style", /width: 125%/);
    await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);

    const after = await stage.evaluate((element) => ({
      height: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(after.height).toBe(before.height);
    expect(after.scrollWidth).toBeGreaterThan(after.clientWidth);
    expect(after.pageWidth).toBe(before.pageWidth);
    expect(after.pageWidth).toBe(before.viewportWidth);
  }
});
