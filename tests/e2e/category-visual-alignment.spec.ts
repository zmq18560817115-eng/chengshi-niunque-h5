import { expect, test } from "@playwright/test";
import { categoryCardLayouts } from "../../src/config/h5-category-themes";

const routes = ["inspection-projects", "review-assurance", "production-traceability"] as const;
const widths = [375, 390, 414] as const;

test.use({ browserName: "chromium" });

for (const width of widths) {
  for (const slug of routes) {
    test(`${slug} keeps card copy on the 1000px master at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 896 });
      await page.goto(`/reports/${slug}`);
      const stage = page.locator(".category-page-final");
      await expect(stage).toBeVisible();

      const stageBox = await stage.boundingBox();
      expect(stageBox?.width).toBe(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      const layouts = categoryCardLayouts[slug];
      const cards = page.locator(".category-card-hotspot");
      await expect(cards).toHaveCount(layouts.length);

      for (let index = 0; index < layouts.length; index += 1) {
        const cardBox = await cards.nth(index).boundingBox();
        const copyBox = await cards.nth(index).locator(".category-card-copy").boundingBox();
        const scale = width / 1000;
        expect(cardBox?.x).toBeCloseTo(layouts[index].x * scale, 0);
        expect(cardBox?.y).toBeCloseTo(layouts[index].y * scale, 0);
        expect(copyBox?.x).toBeCloseTo((layouts[index].x + layouts[index].contentX) * scale, 0);
        expect(copyBox?.y).toBeCloseTo((layouts[index].y + layouts[index].contentY) * scale, 0);
      }

      await stage.screenshot({
        path: `test-results/category-visual-alignment/${slug}-${width}.png`,
      });
    });
  }
}
