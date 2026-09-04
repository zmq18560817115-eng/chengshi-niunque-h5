import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { categoryCardLayouts } from "../../src/config/h5-category-themes";

const routes = ["inspection-projects", "review-assurance", "production-traceability"] as const;
const widths = [375, 390, 414] as const;
const categoryArtworkHeightRatio = 4333 / 2000;

test.use({ browserName: "chromium" });

async function expectCategoryArtworkPainted(page: Page, stage: Locator) {
  await expect.poll(() => stage.locator("img").evaluateAll((images) => images.length > 0 && images.every((image) => {
    const bitmap = image as HTMLImageElement;
    return bitmap.complete && bitmap.naturalWidth > 0;
  })), { timeout: 15000 }).toBe(true);
  await expect(page.locator(".runtime-loading-layer:not(.is-persistent)")).toHaveCount(0, { timeout: 15000 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}

for (const width of widths) {
  for (const slug of routes) {
    test(`${slug} keeps card copy on the 1000px master at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 896 });
      await page.goto(`/reports/${slug}`);
      const stage = page.locator(".category-page-final");
      const viewport = page.locator(".category-page-viewport");
      await expect(stage).toBeVisible();
      await expectCategoryArtworkPainted(page, stage);
      // Measure after the 280 ms page-enter transform has settled; otherwise
      // boundingBox() includes the transient 7 px animation offset.
      await page.waitForTimeout(350);

      const stageBox = await stage.boundingBox();
      const viewportBox = await viewport.boundingBox();
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(stageBox?.width).toBe(clientWidth);
      expect(stageBox?.height).toBe(896);
      expect(viewportBox?.width).toBeCloseTo(clientWidth, 0);
      expect(viewportBox?.height).toBeCloseTo(clientWidth * categoryArtworkHeightRatio, 0);
      expect((viewportBox?.width ?? 0) / (viewportBox?.height ?? 1)).toBeCloseTo(2000 / 4333, 3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(clientWidth);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(896);
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-h5-page-lock"))).toBe("category");
      await expect(stage).toHaveCSS("overflow-y", "auto");
      const backdrop = await stage.evaluate((node) => {
        const style = getComputedStyle(node);
        return { image: style.backgroundImage, position: style.backgroundPosition, repeat: style.backgroundRepeat, size: style.backgroundSize };
      });
      expect(backdrop.image).toContain("category-paper-base.runtime.webp");
      expect(backdrop.image).toContain("category-runtime");
      expect(backdrop.position).toContain("50%");
      expect(backdrop.repeat).toBe("repeat-x");
      expect(backdrop.size).toContain("auto");
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

test("short embedded browser scrolls the fixed category stage without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/reports/inspection-projects");
  const stage = page.locator(".category-page-final");
  await expect(stage).toBeVisible();
  await expectCategoryArtworkPainted(page, stage);
  await page.waitForTimeout(350);
  const viewport = page.locator(".category-page-viewport");
  const folder = page.locator('[data-category-layer="folder"]');
  const viewportBox = await viewport.boundingBox();
  const folderBox = await folder.boundingBox();
  expect(await viewport.getAttribute("data-artwork-source")).toBe("layered-components");
  expect(viewportBox?.width).toBeCloseTo(375, 0);
  expect(viewportBox?.height).toBeCloseTo(375 * categoryArtworkHeightRatio, 0);
  expect(folderBox?.x).toBeLessThan(viewportBox?.x ?? 0);
  expect((folderBox?.x ?? 0) + (folderBox?.width ?? 0)).toBeGreaterThan((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0));
  expect((folderBox?.width ?? 0) / (viewportBox?.width ?? 1)).toBeCloseTo(2502 / 2000, 3);

  const beforeScroll = await stage.evaluate((node) => ({
    clientHeight: node.clientHeight,
    clientWidth: node.clientWidth,
    scrollHeight: node.scrollHeight,
    scrollLeft: node.scrollLeft,
    scrollTop: node.scrollTop,
    scrollWidth: node.scrollWidth,
  }));
  expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight);
  expect(beforeScroll.scrollWidth).toBe(beforeScroll.clientWidth);
  expect(beforeScroll.scrollLeft).toBe(0);
  expect(beforeScroll.scrollTop).toBe(0);

  const afterScroll = await stage.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    return { scrollLeft: node.scrollLeft, scrollTop: node.scrollTop };
  });
  expect(afterScroll.scrollTop).toBeGreaterThan(0);
  expect(afterScroll.scrollLeft).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("category artwork width and coordinates stay stable when the visible height changes", async ({ page }) => {
  for (const slug of routes) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/reports/${slug}`);
    const stage = page.locator(".category-page-final");
    await expect(stage).toBeVisible();
    await expectCategoryArtworkPainted(page, stage);
    await page.waitForTimeout(350);
    await stage.evaluate((node) => { node.scrollTop = 0; });

    const before = await page.evaluate(() => {
      const viewport = document.querySelector(".category-page-viewport");
      const cards = [...document.querySelectorAll(".category-card-hotspot")];
      return {
        viewport: viewport?.getBoundingClientRect().toJSON(),
        cards: cards.map((card) => card.getBoundingClientRect().toJSON()),
      };
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => {
      const viewport = document.querySelector(".category-page-viewport");
      const cards = [...document.querySelectorAll(".category-card-hotspot")];
      return {
        viewport: viewport?.getBoundingClientRect().toJSON(),
        cards: cards.map((card) => card.getBoundingClientRect().toJSON()),
        documentScrollWidth: document.documentElement.scrollWidth,
        stageHeight: document.querySelector(".category-page-final")?.getBoundingClientRect().height,
        windowScrollY: window.scrollY,
      };
    });

    expect(after.viewport?.width).toBeCloseTo(before.viewport?.width ?? 0, 0);
    expect(after.viewport?.height).toBeCloseTo(before.viewport?.height ?? 0, 0);
    expect(after.viewport?.x).toBeCloseTo(before.viewport?.x ?? 0, 0);
    expect(after.viewport?.y).toBeCloseTo(before.viewport?.y ?? 0, 0);
    expect(after.cards).toHaveLength(before.cards.length);
    for (let index = 0; index < before.cards.length; index += 1) {
      expect(after.cards[index].x).toBeCloseTo(before.cards[index].x, 0);
      expect(after.cards[index].y).toBeCloseTo(before.cards[index].y, 0);
      expect(after.cards[index].width).toBeCloseTo(before.cards[index].width, 0);
      expect(after.cards[index].height).toBeCloseTo(before.cards[index].height, 0);
    }
    expect(after.stageHeight).toBeCloseTo(812, 0);
    expect(after.documentScrollWidth).toBe(375);
    expect(after.windowScrollY).toBe(0);
  }
});
