import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/archive-press-qa";
await fs.mkdir(output, { recursive: true });
const slugs = ["inspection-projects", "review-assurance", "production-traceability"];
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium"
    ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const slug of slugs) {
      for (const trigger of ["folder", "cue"]) {
        const width = trigger === "folder" ? 375 : 430;
        const height = trigger === "folder" ? 812 : 932;
        const name = `${engine}-${slug}-${trigger}`;
        const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        await page.route(`**/reports/${slug}**`, async (route) => { await gate; await route.continue().catch(() => {}); });
        try {
          await page.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
          const archive = page.locator(".reports-archive");
          await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
          const selector = trigger === "folder" ? `[data-slug="${slug}"]` : `[data-cue-slug="${slug}"]`;
          const hotspot = page.locator(selector);
          await page.locator(`[data-cue-slug="${slug}"]`).scrollIntoViewIfNeeded();
          const point = await hotspot.evaluate((node, trigger) => {
            const r = node.getBoundingClientRect();
            // Folder contours are asymmetric. Use the center of the title's
            // matching original color area, below its separate click arrow.
            if (trigger === "folder") {
              const slug = node.dataset.slug;
              const part = document.querySelector(`[data-title-group="${slug}"] .archive-section-character-slot`).getBoundingClientRect();
              return { x: part.left + part.width * .5, y: part.top + part.height * .65 };
            }
            return { x: r.x + r.width * .5, y: r.y + r.height * .6 };
          }, trigger);
          expect(await page.evaluate(({ x, y, selector }) => document.elementFromPoint(x, y)?.closest(selector) !== null, { ...point, selector })).toBe(true);
          await page.screenshot({ path: `${output}/${name}-rest.png` });
          await page.mouse.move(point.x, point.y);
          await page.mouse.down();
          const feedback = await page.evaluate((slug) => {
            const root = document.querySelector(".reports-archive");
            const folder = document.querySelector(`[data-archive-module="${slug}"]`);
            const title = document.querySelector(`[data-title-group="${slug}"] .archive-section-character-slot`);
            const cue = document.querySelector(`[data-cue-module="${slug}"]`);
            const hotspot = document.querySelector(`[data-slug="${slug}"]`);
            return { selected: root.dataset.pressedSlug, filter: getComputedStyle(folder).filter,
              filterDuration: getComputedStyle(folder).transitionDuration,
              titleTransform: getComputedStyle(title).transform, cueTransform: getComputedStyle(cue).transform,
              tint: getComputedStyle(hotspot).backgroundColor,
              otherFilters: [...document.querySelectorAll("[data-archive-module]")].filter((n) => n !== folder).map((n) => getComputedStyle(n).filter),
              cueDuration: getComputedStyle(cue.querySelector("img")).animationDuration };
          }, slug);
          expect(feedback.selected).toBe(slug);
          expect(feedback.filter).toContain("brightness(0.86)");
          expect(feedback.filterDuration).toBe("0s");
          expect(feedback.titleTransform).toContain("0.94");
          expect(feedback.cueTransform).toContain("0.94");
          expect(feedback.tint).toBe("rgba(64, 41, 31, 0.1)");
          expect(feedback.otherFilters.every((filter) => filter === "none")).toBe(true);
          expect(feedback.cueDuration).toBe("1.8s");
          await page.screenshot({ path: `${output}/${name}-pressed.png` });

          // Drag away: restore the board without interpreting scrolling as a tap.
          await page.mouse.move(point.x, point.y + 24, { steps: 3 });
          await page.mouse.up();
          await expect(archive).not.toHaveAttribute("data-pressed-slug");
          await expect(page).toHaveURL(`${base}/reports`);
          await expect(page.locator("#h5-category-route-loading-host")).toHaveAttribute("aria-hidden", "true");
          await page.mouse.move(point.x, point.y);
          await page.mouse.down();
          await page.mouse.up();
          const immediateLoading = await page.locator("#h5-category-route-loading-host").getAttribute("aria-hidden");
          expect(immediateLoading).toBe("false");
          await expect(page.locator("#h5-category-route-loading-host .guide-loading-buffer")).toBeVisible();
          await page.screenshot({ path: `${output}/${name}-loading.png` });
          release();
          await expect(page).toHaveURL(`${base}/reports/${slug}`, { timeout: 15000 });
          await expect(page.locator("#h5-category-route-loading-host")).toHaveAttribute("aria-hidden", "true", { timeout: 15000 });
          results.push({ engine, slug, trigger, width, height, feedback, immediateLoading: true, cancelledDrag: true });
          await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
          console.log(`${name}: passed`);
        } finally { release(); await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ passed: results.length }));
