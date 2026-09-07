import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/guide-quick-entry-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium"
    ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
    : webkit.launch());
  try {
    const cases = [
      { width: 375, height: 812 }, { width: 430, height: 932 },
      { width: 375, height: 667 }, { width: 844, height: 390 },
      { width: 375, height: 812, loading: true },
      { width: 375, height: 812, reduced: true },
    ];
    for (const options of cases) {
      const { width, height, loading = false, reduced = false } = options;
      const name = `${engine}-${width}x${height}-${loading ? "loading" : reduced ? "reduced" : "animating"}`;
      if (process.env.H5_QA_CASE && !name.includes(process.env.H5_QA_CASE)) continue;
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true,
        deviceScaleFactor: 1, reducedMotion: reduced ? "reduce" : "no-preference" });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        window.__guideQuick = {};
        new MutationObserver(() => {
          const snapshot = document.querySelector("[data-guide-current-frame]");
          const source = document.querySelector(".brand-guide .brand-guide-artwork");
          if (!snapshot || !source || window.__guideQuick.capture) return;
          const originals = [source, ...source.querySelectorAll("*")];
          const copies = [snapshot, ...snapshot.querySelectorAll("*")];
          window.__guideQuick.capture = originals.map((original, index) => {
            const copy = copies[index];
            const a = original.getBoundingClientRect(), b = copy.getBoundingClientRect();
            const sa = getComputedStyle(original), sb = getComputedStyle(copy);
            return { className: original.className, maxRectDelta: Math.max(...["x", "y", "width", "height"].map((key) => Math.abs(a[key] - b[key]))),
              transform: sa.transform, snapshotTransform: sb.transform,
              opacity: sa.opacity, snapshotOpacity: sb.opacity, animation: sb.animationName,
              loaded: !(original instanceof HTMLImageElement) || (original.complete && original.naturalWidth > 0),
              snapshotVisibility: sb.visibility };
          });
          window.__guideQuick.state = document.querySelector(".brand-guide-stage").dataset.loadState;
          window.__guideQuick.paperTime = source.querySelector(".brand-guide-paper")?.getAnimations()[0]?.currentTime ?? null;
        }).observe(document, { childList: true, subtree: true });
      });
      let releasePaper = () => {};
      if (loading) {
        const gate = new Promise((resolve) => { releasePaper = resolve; });
        await page.route("**/guide/report-paper-bottom.webp", async (route) => { await gate; await route.continue().catch(() => {}); });
      }
      try {
        await page.goto(`${base}/go`, { waitUntil: "domcontentloaded" });
        const stage = page.locator(".brand-guide-stage");
        await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15000 });
        if (loading) {
          await expect(stage).toHaveAttribute("data-load-state", "loading");
          await expect(stage).toHaveAttribute("data-animation-state", "paused");
        } else if (!reduced) {
          await expect(stage).toHaveAttribute("data-animation-state", "running");
        }

        // A small gesture can be cancelled before the intro has finished.
        await page.mouse.move(width * .5, height * .7);
        await page.mouse.down();
        await page.mouse.move(width * .5, height * .7 - 12, { steps: 2 });
        await page.mouse.up();
        await expect(page.locator(".brand-guide")).toHaveAttribute("data-swipe-interaction", "idle");
        await expect(page).toHaveURL(`${base}/go`);
        if (!loading && !reduced && width < height) {
          await page.waitForFunction(() => {
            const time = document.querySelector(".brand-guide-paper")?.getAnimations()[0]?.currentTime;
            return typeof time === "number" && time >= 700;
          });
        }
        const before = await stage.evaluate((node) => ({ load: node.dataset.loadState,
          time: node.querySelector(".brand-guide-paper")?.getAnimations()[0]?.currentTime ?? null }));
        await page.mouse.move(width * .5, height * .75);
        await page.mouse.down();
        await page.mouse.move(width * .5, height * .49, { steps: 4 });
        await page.mouse.up();
        await expect(page.locator("[data-guide-current-frame]")).toHaveCount(1);
        const capture = await page.evaluate(() => window.__guideQuick);
        for (const [index, part] of capture.capture.entries()) {
          expect(part.maxRectDelta, `${name}: ${part.className} bounds`).toBeLessThan(1);
          expect(part.snapshotTransform, `${name}: ${part.className} pose`).toBe(part.transform);
          if (index > 0) expect(part.snapshotOpacity).toBe(part.opacity);
          expect(part.animation).toBe("none");
          if (!part.loaded) expect(part.snapshotVisibility).toBe("hidden");
        }
        if (!loading && !reduced && width < height) expect(capture.paperTime).toBeLessThan(2140);
        await page.screenshot({ path: `${output}/${name}-handoff.png` });
        releasePaper();
        await expect(page).toHaveURL(`${base}/reports`, { timeout: 15000 });
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
        await expect(page.locator("#h5-guide-route-buffer-host > *")).toHaveCount(0);
        await page.screenshot({ path: `${output}/${name}-home.png` });
        expect(errors).toEqual([]);
        results.push({ engine, ...options, cancelledGesture: true, before, capture, passed: true });
        await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`${name}: passed`);
      } catch (error) {
        console.error(name, await page.locator(".brand-guide-stage").evaluate((node) => ({ state: node.dataset.loadState, images: [...node.querySelectorAll("img")].map((image) => ({ src: image.getAttribute("src"), complete: image.complete, width: image.naturalWidth })) })));
        await page.screenshot({ path: `${output}/${name}-failure.png` });
        throw error;
      } finally { releasePaper(); await page.close(); }
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ passed: results.length }));
