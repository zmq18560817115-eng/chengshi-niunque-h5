import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/ribbon-entry-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = engine === "chromium" ? await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : await webkit.launch();
  try {
    for (const [width, height, fromGuide] of [[375, 812, false], [430, 932, false], [375, 667, false], [375, 812, true], [844, 390, true]]) {
      const name = `${engine}-${width}x${height}-${fromGuide ? "guide" : "direct"}`;
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await page.addInitScript(() => {
        window.__ribbonSamples = [];
        const sample = () => {
          const root = document.querySelector(".reports-archive .archive-unlock-tab-motion");
          if (root) {
            const image = root.querySelector("img");
            const clip = root.querySelector(".archive-unlock-tab-clip");
            const rect = image.getBoundingClientRect();
            const anchor = clip.getBoundingClientRect();
            const style = getComputedStyle(image);
            window.__ribbonSamples.push({ state: root.dataset.unlockState, x: rect.x, y: rect.y, anchorX: anchor.x, right: anchor.right, duration: style.animationDuration, name: style.animationName });
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      try {
        await page.goto(`${base}/${fromGuide ? "go" : "reports"}`, { waitUntil: "domcontentloaded" });
        if (fromGuide) {
          await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 15000 });
          await expect(page.locator(".brand-guide .h5-guide-archive-entry-ribbon-clip")).toHaveCSS("visibility", "hidden");
          await page.getByRole("button", { name: "进入档案" }).click();
          await expect(page).toHaveURL(`${base}/reports`, { timeout: 15000 });
          await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
        }
        const root = page.locator(".reports-archive .archive-unlock-tab-motion");
        const clip = root.locator(".archive-unlock-tab-clip");
        const image = root.locator("img");
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
        await clip.scrollIntoViewIfNeeded();
        await expect(root).toHaveAttribute("data-unlock-state", "fixed", { timeout: 10000 });
        const samples = await page.evaluate(() => window.__ribbonSamples);
        expect(samples.some((s) => s.state === "hidden" && s.x >= s.right)).toBe(true);
        expect(samples.some((s) => s.state === "entering" && s.x > s.anchorX + .1 && s.x < s.right && s.duration === "0.8s" && s.name === "archive-ribbon-enter")).toBe(true);
        const final = await image.boundingBox();
        const anchor = await clip.boundingBox();
        expect(final.x).toBeCloseTo(anchor.x, 1);
        expect(final.y).toBeCloseTo(anchor.y, 1);
        expect(final.width).toBeCloseTo(anchor.width, 1);
        await expect(image).toHaveCSS("animation-name", "none");
        await expect(image).toHaveCount(1);
        await page.screenshot({ path: `${output}/${name}-settled.png` });
        const beforeY = await page.evaluate(() => scrollY);
        if (engine === "webkit") await page.evaluate(() => window.scrollBy(0, 180));
        else await page.mouse.wheel(0, 180);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeY + 100);
        const afterY = await page.evaluate(() => scrollY);
        const moved = await image.boundingBox();
        expect(moved.y + afterY).toBeCloseTo(final.y + beforeY, 0);
        expect(moved.x).toBeCloseTo(final.x, 1);
        await expect(root).toHaveAttribute("data-unlock-state", "fixed");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        results.push({ name, final, samples, scrollDelta: afterY - beforeY, passed: true });
        await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`${name}: passed`);
      } finally { await page.close(); }
    }
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    await page.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
    const root = page.locator(".reports-archive .archive-unlock-tab-motion");
    await expect(root).toHaveAttribute("data-unlock-state", "fixed");
    await expect(root.locator("img")).toHaveCSS("animation-name", "none");
    results.push({ name: `${engine}-reduced`, passed: true });
    await page.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length }));
