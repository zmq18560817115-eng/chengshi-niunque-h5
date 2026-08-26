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
      const viewport = page.locator(".category-page-viewport");
      await expect(stage).toBeVisible();
      // Measure after the 280 ms page-enter transform has settled; otherwise
      // boundingBox() includes the transient 7 px animation offset.
      await page.waitForTimeout(350);

      const stageBox = await stage.boundingBox();
      const viewportBox = await viewport.boundingBox();
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(stageBox?.width).toBe(clientWidth);
      expect(stageBox?.height).toBe(896);
      expect(viewportBox?.width).toBeLessThanOrEqual(clientWidth);
      expect(viewportBox?.height).toBeLessThanOrEqual(896);
      expect((viewportBox?.width ?? 0) / (viewportBox?.height ?? 1)).toBeCloseTo(2000 / 4333, 3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(clientWidth);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(896);
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-h5-page-lock"))).toBe("category");
      const backdrop = await stage.evaluate((node) => {
        const style = getComputedStyle(node);
        return { image: style.backgroundImage, position: style.backgroundPosition, repeat: style.backgroundRepeat, size: style.backgroundSize };
      });
      expect(backdrop.image).not.toBe("none");
      expect(backdrop.position).toBe("50% 100%");
      expect(backdrop.repeat).toBe("no-repeat");
      expect(backdrop.size).toBe("100%");
      await page.evaluate(() => window.scrollTo(0, 999999));
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      const layouts = categoryCardLayouts[slug];
      const cards = page.locator(".category-card-hotspot");
      await expect(cards).toHaveCount(layouts.length);

      for (let index = 0; index < layouts.length; index += 1) {
        const cardBox = await cards.nth(index).boundingBox();
        const copyBox = await cards.nth(index).locator(".category-card-copy").boundingBox();
        const scale = (viewportBox?.width ?? width) / 1000;
        expect(cardBox?.x).toBeCloseTo((viewportBox?.x ?? 0) + layouts[index].x * scale, 0);
        expect(cardBox?.y).toBeCloseTo((viewportBox?.y ?? 0) + layouts[index].y * scale, 0);
        expect(copyBox?.x).toBeCloseTo((viewportBox?.x ?? 0) + (layouts[index].x + layouts[index].contentX) * scale, 0);
        expect(copyBox?.y).toBeCloseTo((viewportBox?.y ?? 0) + (layouts[index].y + layouts[index].contentY) * scale, 0);
      }

      await stage.screenshot({
        path: `test-results/category-visual-alignment/${slug}-${width}.png`,
      });
    });
  }
}

test("short embedded browser extends only category edge texture into side gutters", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/reports/inspection-projects");
  const stage = page.locator(".category-page-final");
  await expect(stage).toBeVisible();
  await page.waitForTimeout(350);
  const edgeLayers = await stage.evaluate((node) => {
    const before = getComputedStyle(node, "::before");
    const after = getComputedStyle(node, "::after");
    return {
      before: { width: before.width, position: before.backgroundPosition, size: before.backgroundSize },
      after: { width: after.width, position: after.backgroundPosition, size: after.backgroundSize },
    };
  });
  expect(Number.parseFloat(edgeLayers.before.width)).toBeGreaterThan(0);
  expect(edgeLayers.before.size).toBe("4000% 100%");
  expect(edgeLayers.before.position).toBe("0% 0%");
  expect(edgeLayers.after.width).toBe(edgeLayers.before.width);
  expect(edgeLayers.after.size).toBe("4000% 100%");
  expect(edgeLayers.after.position).toBe("0% 0%");
});
