import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { categoryCardLayouts } from "../../src/config/h5-category-themes";

const routes = ["inspection-projects", "review-assurance", "production-traceability"] as const;
// Keep the wider Android/iOS viewport coverage that was added during device QA.
const widths = [375, 390, 412, 414, 428] as const;
const portraitViewports = [
  ...widths.map((width) => ({ width, height: 896 })),
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 892 },
  { width: 428, height: 926 },
] as const;
const shortViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
] as const;
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

for (const size of portraitViewports) {
  for (const slug of routes) {
    test(`${slug} fills the width and bottom edge at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(`/reports/${slug}`);
      const stage = page.locator(".category-page-final");
      const scrollRegion = page.locator(".category-page-scroll-region");
      const viewport = page.locator(".category-page-viewport");
      await expect(stage).toBeVisible();
      await expectCategoryArtworkPainted(page, stage);
      // Measure after the direct-entry transform has settled; otherwise
      // boundingBox() can include its transient vertical offset.
      await page.waitForTimeout(350);

      const stageBox = await stage.boundingBox();
      const viewportBox = await viewport.boundingBox();
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(stageBox?.width).toBeCloseTo(clientWidth, 0);
      expect(stageBox?.height).toBeCloseTo(size.height, 0);
      expect(viewportBox?.width).toBeCloseTo(clientWidth, 0);
      expect(viewportBox?.height).toBeCloseTo(clientWidth * categoryArtworkHeightRatio, 0);
      expect((viewportBox?.width ?? 0) / (viewportBox?.height ?? 1)).toBeCloseTo(2000 / 4333, 3);
      expect(viewportBox?.x).toBeCloseTo((clientWidth - (viewportBox?.width ?? 0)) / 2, 0);
      expect(viewportBox?.y).toBeCloseTo(stageBox?.y ?? 0, 0);

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(clientWidth);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-h5-page-lock"))).toBe("category");
      await expect(stage).toHaveCSS("overflow", "hidden");
      await expect(scrollRegion).toHaveCSS("overflow-y", "auto");
      const sheetBox = await page.locator(".category-page-sheet").boundingBox();
      const tailBox = await page.locator(".category-page-tail").boundingBox();
      expect(sheetBox?.height).toBeCloseTo(Math.max(size.height, viewportBox?.height ?? 0), 0);
      expect(tailBox?.height).toBeCloseTo(Math.max(0, size.height - (viewportBox?.height ?? 0)), 0);

      const fixedMetrics = await page.evaluate(() => {
        const stageNode = document.querySelector<HTMLElement>(".category-page-final");
        const scrollNode = document.querySelector<HTMLElement>(".category-page-scroll-region");
        if (!stageNode || !scrollNode) throw new Error("category stage did not mount");
        scrollNode.scrollTop = scrollNode.scrollHeight;
        stageNode.scrollTop = stageNode.scrollHeight;
        return {
          stageClientHeight: stageNode.clientHeight,
          stageScrollHeight: stageNode.scrollHeight,
          stageScrollTop: stageNode.scrollTop,
          scrollClientHeight: scrollNode.clientHeight,
          scrollHeight: scrollNode.scrollHeight,
          scrollTop: scrollNode.scrollTop,
          windowScrollY: window.scrollY,
        };
      });
      expect(Math.abs(fixedMetrics.stageScrollHeight - fixedMetrics.stageClientHeight)).toBeLessThanOrEqual(1);
      expect(fixedMetrics.stageScrollTop).toBe(0);
      expect(fixedMetrics.scrollTop).toBeCloseTo(Math.max(0, fixedMetrics.scrollHeight - fixedMetrics.scrollClientHeight), 0);
      expect(fixedMetrics.windowScrollY).toBe(0);
      await scrollRegion.evaluate((node) => { node.scrollTop = 0; });

      const backdrop = await scrollRegion.evaluate((node) => {
        const style = getComputedStyle(node);
        return { image: style.backgroundImage, position: style.backgroundPosition, repeat: style.backgroundRepeat, size: style.backgroundSize };
      });
      expect(backdrop.image).toContain("/design/2026-09-07/runtime/category-paper.webp");
      expect(backdrop.position).toContain("50%");
      expect(backdrop.repeat).toBe("repeat-x");
      expect(backdrop.size).toContain("auto");

      const layouts = categoryCardLayouts[slug];
      const cards = page.locator(".category-card-hotspot");
      await expect(cards).toHaveCount(layouts.length);

      for (let index = 0; index < layouts.length; index += 1) {
        const cardBox = await cards.nth(index).boundingBox();
        const copyBox = await cards.nth(index).locator(".category-card-copy").boundingBox();
        // All authored coordinates follow the same width-based artboard scale.
        const scale = (viewportBox?.width ?? size.width) / 1000;
        expect(cardBox?.x).toBeCloseTo((viewportBox?.x ?? 0) + layouts[index].x * scale, 0);
        expect(cardBox?.y).toBeCloseTo((viewportBox?.y ?? 0) + layouts[index].y * scale, 0);
        expect(copyBox?.x).toBeCloseTo((viewportBox?.x ?? 0) + (layouts[index].x + layouts[index].contentX) * scale, 0);
        expect(copyBox?.y).toBeCloseTo((viewportBox?.y ?? 0) + (layouts[index].y + layouts[index].contentY) * scale, 0);
      }

      await stage.screenshot({
        path: `test-results/category-visual-alignment/${slug}-${size.width}x${size.height}.png`,
      });
    });
  }
}

for (const size of shortViewports) {
  test(`short ${size.width}x${size.height} browser keeps internal category scrolling without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/reports/inspection-projects");
    const stage = page.locator(".category-page-final");
    const scrollRegion = page.locator(".category-page-scroll-region");
    await expect(stage).toBeVisible();
    await expectCategoryArtworkPainted(page, stage);
    await page.waitForTimeout(350);
    const viewport = page.locator(".category-page-viewport");
    const folder = page.locator('[data-category-layer="folder"]');
    const viewportBox = await viewport.boundingBox();
    const folderBox = await folder.boundingBox();
    expect(await viewport.getAttribute("data-artwork-source")).toBe("layered-components");
    expect(viewportBox?.width).toBeCloseTo(size.width, 0);
    expect(viewportBox?.height).toBeCloseTo(size.width * categoryArtworkHeightRatio, 0);
    expect(folderBox?.x).toBeLessThan(viewportBox?.x ?? 0);
    expect((folderBox?.x ?? 0) + (folderBox?.width ?? 0)).toBeGreaterThan((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0));
    expect((folderBox?.width ?? 0) / (viewportBox?.width ?? 1)).toBeCloseTo(2325 / 2000, 3);

    const beforeScroll = await scrollRegion.evaluate((node) => ({
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
    await expect(scrollRegion).toHaveCSS("overflow-y", "auto");

    const afterScroll = await scrollRegion.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return { scrollLeft: node.scrollLeft, scrollTop: node.scrollTop };
    });
    expect(afterScroll.scrollTop).toBeGreaterThan(0);
    expect(afterScroll.scrollLeft).toBe(0);
    expect(await stage.evaluate((node) => node.scrollTop)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
  });
}

test("category coordinates and width remain stable when the visible height changes", async ({ page }) => {
  for (const slug of routes) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/reports/${slug}`);
    const stage = page.locator(".category-page-final");
    const scrollRegion = page.locator(".category-page-scroll-region");
    await expect(stage).toBeVisible();
    await expectCategoryArtworkPainted(page, stage);
    await page.waitForTimeout(350);
    await scrollRegion.evaluate((node) => { node.scrollTop = 0; });

    const readNormalizedGeometry = () => page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>(".category-page-viewport")?.getBoundingClientRect();
      if (!viewport) throw new Error("category viewport did not mount");
      const cards = [...document.querySelectorAll<HTMLElement>(".category-card-hotspot")];
      return {
        viewport: { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height },
        cards: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            x: (rect.x - viewport.x) / viewport.width,
            y: (rect.y - viewport.y) / viewport.height,
            width: rect.width / viewport.width,
            height: rect.height / viewport.height,
          };
        }),
      };
    });

    const before = await readNormalizedGeometry();
    expect(before.viewport.width / before.viewport.height).toBeCloseTo(2000 / 4333, 3);
    const shortMetrics = await scrollRegion.evaluate((node) => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }));
    expect(shortMetrics.scrollHeight).toBeGreaterThan(shortMetrics.clientHeight);

    await page.setViewportSize({ width: 375, height: 932 });
    await expect.poll(() => stage.evaluate((node) => node.clientHeight)).toBe(932);
    await expect.poll(() => scrollRegion.evaluate((node) => node.scrollTop)).toBe(0);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const after = await readNormalizedGeometry();
    expect(after.viewport.width).toBeCloseTo(before.viewport.width, 3);
    expect(after.viewport.width / after.viewport.height).toBeCloseTo(2000 / 4333, 3);
    expect(after.cards).toHaveLength(before.cards.length);
    for (let index = 0; index < before.cards.length; index += 1) {
      expect(after.cards[index].x).toBeCloseTo(before.cards[index].x, 3);
      expect(after.cards[index].y).toBeCloseTo(before.cards[index].y, 3);
      expect(after.cards[index].width).toBeCloseTo(before.cards[index].width, 3);
      expect(after.cards[index].height).toBeCloseTo(before.cards[index].height, 3);
    }

    const afterMetrics = await scrollRegion.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return { clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop };
    });
    expect(Math.abs(afterMetrics.scrollHeight - afterMetrics.clientHeight)).toBeLessThanOrEqual(1);
    expect(afterMetrics.scrollTop).toBe(0);
    expect(await stage.evaluate((node) => node.scrollTop)).toBe(0);
    expect(await page.evaluate(() => ({
      documentScrollHeight: document.documentElement.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      windowScrollY: window.scrollY,
    }))).toEqual({ documentScrollHeight: 932, documentScrollWidth: 375, windowScrollY: 0 });
  }
});
