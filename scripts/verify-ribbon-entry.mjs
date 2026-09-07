import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/ribbon-entry-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
// Pixel evidence catches a ribbon burned into the background, which a DOM
// count of the independently animated image cannot detect. Pillow is also
// used by the repository's source-art verification scripts.
const purplePixels = (path) => Number(execFileSync("python", ["-c", [
  "from PIL import Image", "import sys",
  "im = Image.open(sys.argv[1]).convert('RGB')",
  "print(sum(1 for r,g,b in im.getdata() if b-r > 12 and b-g > 10 and r > 90 and g > 80))",
].join("\n"), path], { encoding: "utf8" }).trim());
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = engine === "chromium" ? await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : await webkit.launch();
  try {
    for (const [width, height, fromGuide] of [[375, 812, false], [430, 932, false], [375, 667, false], [375, 812, true], [844, 390, true]]) {
      const name = `${engine}-${width}x${height}-${fromGuide ? "guide" : "direct"}`;
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await page.addInitScript(() => {
        const NativeObserver = window.IntersectionObserver;
        const pending = new Map();
        let holdRibbon = true;
        window.__releaseRibbon = () => {
          holdRibbon = false;
          for (const [observer, { callback, entries }] of pending) callback(entries, observer);
          pending.clear();
        };
        window.IntersectionObserver = class extends NativeObserver {
          constructor(callback, options) {
            super((entries, observer) => {
              const ribbon = entries.filter((entry) => entry.target.matches(".archive-unlock-tab-clip"));
              if (holdRibbon && ribbon.length) pending.set(observer, { callback, entries: ribbon });
              const ready = holdRibbon ? entries.filter((entry) => !ribbon.includes(entry)) : entries;
              if (ready.length) callback(ready, observer);
            }, options);
          }
          disconnect() { pending.delete(this); super.disconnect(); }
        };
        window.__ribbonSamples = [];
        const sample = () => {
          const root = document.querySelector(".reports-archive .archive-unlock-tab-motion");
          if (root) {
            const image = root.querySelector("img");
            const clip = root.querySelector(".archive-unlock-tab-clip");
            const rect = image.getBoundingClientRect();
            const anchor = clip.getBoundingClientRect();
            const style = getComputedStyle(image);
            window.__ribbonSamples.push({ state: root.dataset.unlockState, x: rect.x, y: rect.y, opacity: Number(style.opacity), anchorX: anchor.x, right: anchor.right, duration: style.animationDuration, name: style.animationName });
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
          // Inspect the actual guide destination layers at their final geometry
          // before committing the route, including the pixels in its base art.
          await page.evaluate(() => {
            const probe = document.createElement("div");
            probe.id = "ribbon-surface-probe";
            Object.assign(probe.style, { position: "fixed", inset: "0", width: "375px", height: "812px", zIndex: "2147483647" });
            probe.append(document.querySelector(".brand-guide .h5-guide-archive-entry-visual").cloneNode(true));
            document.body.append(probe);
          });
          const guideBox = await page.locator("#ribbon-surface-probe .h5-guide-archive-entry-ribbon-clip").boundingBox();
          // A landscape screen is shorter than this portrait probe; the portrait
          // guide case provides the pixel assertion for the same shared artwork.
          if (height >= 812) {
            const path = `${output}/${name}-guide-buffer-hidden.png`;
            await page.screenshot({ path, clip: { ...guideBox, width: Math.min(guideBox.width, width - guideBox.x) } });
            expect(purplePixels(path), "the guide destination must not show the printed copy").toBe(0);
          }
          await page.locator("#ribbon-surface-probe").evaluate((node) => node.remove());
          await page.getByRole("button", { name: "进入档案" }).click();
          await expect(page).toHaveURL(`${base}/reports`, { timeout: 15000 });
          await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
        }
        const root = page.locator(".reports-archive .archive-unlock-tab-motion");
        const clip = root.locator(".archive-unlock-tab-clip");
        const image = root.locator("img");
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
        await clip.scrollIntoViewIfNeeded();
        await expect(root).toHaveAttribute("data-unlock-state", "hidden");
        await expect(image).toHaveCSS("opacity", "0");
        const hiddenPath = `${output}/${name}-hidden-tab.png`;
        await clip.screenshot({ path: hiddenPath });
        expect(purplePixels(hiddenPath), "no printed purple ribbon may remain behind the hidden moving layer").toBe(0);
        await page.screenshot({ path: `${output}/${name}-hidden-page.png` });
        await page.evaluate(() => window.__releaseRibbon());
        await expect(root).toHaveAttribute("data-unlock-state", "fixed", { timeout: 10000 });
        const samples = await page.evaluate(() => window.__ribbonSamples);
        expect(samples.some((s) => s.state === "hidden" && s.x >= s.right)).toBe(true);
        expect(samples.some((s) => s.state === "entering" && s.x > s.anchorX + .1 && s.x < s.right && s.duration === "0.8s" && s.name === "archive-ribbon-enter")).toBe(true);
        expect(samples.some((s) => s.state === "entering" && s.opacity > 0 && s.opacity < 1)).toBe(true);
        const final = await image.boundingBox();
        const anchor = await clip.boundingBox();
        expect(final.x).toBeCloseTo(anchor.x, 1);
        expect(final.y).toBeCloseTo(anchor.y, 1);
        expect(final.width).toBeCloseTo(anchor.width, 1);
        await expect(image).toHaveCSS("animation-name", "none");
        await expect(image).toHaveCount(1);
        const finalPath = `${output}/${name}-final-tab.png`;
        await clip.screenshot({ path: finalPath });
        expect(purplePixels(finalPath)).toBeGreaterThan(100);
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
    const slowPage = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
    let releaseDeferred;
    const deferred = new Promise((resolve) => { releaseDeferred = resolve; });
    await slowPage.route("**/archive-2-25.webp", async (route) => { await deferred; await route.continue(); });
    try {
      await slowPage.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
      const fallback = slowPage.locator(".reports-archive-reference-fallback");
      await expect(fallback).toHaveCSS("opacity", "1");
      await expect.poll(() => fallback.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
      await expect(slowPage.locator(".runtime-loading-layer:visible")).toHaveCount(0);
      await expect(slowPage.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "false");
      const path = `${output}/${engine}-slow-fallback-hidden.png`;
      await fallback.locator(".archive-ribbon-backing").screenshot({ path });
      expect(purplePixels(path), "the loading fallback must not show its printed ribbon").toBe(0);
      releaseDeferred();
      await expect(slowPage.locator(".reports-archive .archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "fixed", { timeout: 15000 });
      results.push({ name: `${engine}-slow-fallback`, passed: true });
    } finally { releaseDeferred(); await slowPage.close(); }
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
