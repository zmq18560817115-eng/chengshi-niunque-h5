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
      expect(backdrop.image).toContain("report-texture.webp");
      expect(backdrop.image).not.toContain("category-runtime");
      expect(backdrop.position).toBe("50% 50%");
      expect(backdrop.repeat).toBe("repeat-x");
      expect(backdrop.size).toBe("auto 100%");
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

test("short embedded browser builds category gutters from independent texture layers", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/reports/inspection-projects");
  const stage = page.locator(".category-page-final");
  await expect(stage).toBeVisible();
  await page.waitForTimeout(350);
  const edgeLayers = await stage.evaluate((node) => {
    const before = getComputedStyle(node.querySelector(".category-page-surround-fill--left")!);
    const after = getComputedStyle(node.querySelector(".category-page-surround-fill--right")!);
    return {
      source: node.querySelector(".category-page-surround")?.getAttribute("data-artwork-source"),
      before: { width: before.width, top: before.top, image: before.backgroundImage, blend: before.backgroundBlendMode },
      after: { width: after.width, top: after.top, image: after.backgroundImage, blend: after.backgroundBlendMode },
    };
  });
  expect(edgeLayers.source).toBe("layered-texture");
  expect(Number.parseFloat(edgeLayers.before.width)).toBeGreaterThan(0);
  expect(edgeLayers.after.width).toBe(edgeLayers.before.width);
  expect(Number.parseFloat(edgeLayers.before.top)).toBeCloseTo(667 * .1814, 0);
  expect(Number.parseFloat(edgeLayers.after.top)).toBeCloseTo(667 * .1844, 0);
  expect(edgeLayers.before.image).toContain("report-texture.webp");
  expect(edgeLayers.after.image).toContain("report-texture.webp");
  expect(edgeLayers.before.image).not.toContain("category-runtime");
  expect(edgeLayers.after.image).not.toContain("category-runtime");
  expect(edgeLayers.before.blend).toBe("multiply");
  expect(edgeLayers.after.blend).toBe("multiply");
});
