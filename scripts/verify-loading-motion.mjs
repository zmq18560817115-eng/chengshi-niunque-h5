import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/loading-motion-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium" ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const [width, height] of [[375, 812], [375, 667], [430, 932], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "no-preference" });
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route("**/reports/inspection-projects**", async (route) => { await gate; await route.continue(); });
      await page.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
      const loading = page.locator("#h5-category-route-loading-host");
      const motion = loading.locator(".guide-loading-motion");
      await expect(motion).toHaveAttribute("data-loading-motion-ready", "true");
      await expect(motion.locator(".guide-loading-label")).toHaveCSS("animation-name", "none");
      await page.locator('[data-cue-slug="inspection-projects"]').click();
      await expect(loading).toHaveAttribute("aria-hidden", "false");
      await expect(motion).toBeVisible();
      const label = motion.locator(".guide-loading-label");
      await expect(label).toHaveCSS("animation-play-state", "running");
      await expect(label).toHaveCSS("animation-duration", "3.6s");
      const start = await label.boundingBox();
      await expect.poll(async () => (await label.boundingBox()).x, { timeout: 2000 }).toBeGreaterThan(start.x + 8);
      const poses = [];
      for (const time of [0, 1800, 3500]) {
        const pose = await motion.evaluate((node, time) => {
          const label = node.querySelector(".guide-loading-label");
          const fill = node.querySelector(".guide-loading-progress-fill");
          for (const part of [label, fill]) { const animation = part.getAnimations()[0]; animation.pause(); animation.currentTime = time; }
          const l = label.getBoundingClientRect(); const f = fill.getBoundingClientRect();
          return { x: l.x, y: l.y, right: l.right, width: l.width, height: l.height, fillRight: f.right };
        }, time);
        expect(Math.abs(pose.right - pose.fillRight)).toBeLessThan(1);
        expect(pose.x).toBeGreaterThanOrEqual(0);
        expect(pose.right).toBeLessThanOrEqual(width);
        expect(pose.y).toBeGreaterThanOrEqual(-1);
        expect(pose.y + pose.height).toBeLessThanOrEqual(height);
        poses.push(pose);
        await page.screenshot({ path: `${output}/${engine}-${width}x${height}-${time}.png` });
      }
      expect(poses[2].x - poses[0].x).toBeGreaterThan(150);
      expect(poses[2].y).toBeCloseTo(poses[0].y, 1);
      release();
      await expect(page).toHaveURL(`${base}/reports/inspection-projects`, { timeout: 15000 });
      await expect(loading).toHaveAttribute("aria-hidden", "true", { timeout: 15000 });
      results.push({ engine, width, height, persistentTransition: true, poses });
      await page.close();
    }
    // Report-card routes mount a separate, non-persistent loading surface.
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "no-preference" });
    let releaseReport;
    const reportGate = new Promise((resolve) => { releaseReport = resolve; });
    await page.route("**/reports/**/items/**/reports**", async (route) => { await reportGate; await route.continue(); });
    await page.goto(`${base}/reports/inspection-projects`);
    await page.locator('.category-card-hotspot[data-index="0"]').click();
    const active = page.locator(".runtime-loading-layer:not(.is-persistent):not(.is-leaving)");
    await expect(active.locator(".guide-loading-motion")).toHaveAttribute("data-loading-motion-ready", "true");
    await expect(active.locator(".guide-loading-label")).toHaveCSS("animation-play-state", "running");
    releaseReport();
    await expect(page).toHaveURL(/\/items\/.+\/reports$/, { timeout: 15000 });
    await expect(active).toHaveCount(0, { timeout: 15000 });
    results.push({ engine, reportTransition: true });
    await page.close();
    for (const fallback of ["reduced", "image-error"]) {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: fallback === "reduced" ? "reduce" : "no-preference" });
      if (fallback === "image-error") await page.route("**/loading-label.webp", (route) => route.abort());
      await page.goto(`${base}/reports`);
      const motion = page.locator("#h5-category-route-loading-host .guide-loading-motion");
      if (fallback === "reduced") await expect(motion).toHaveCSS("display", "none");
      else await expect(motion).toHaveAttribute("data-loading-motion-ready", "false");
      await expect(page.locator("#h5-category-route-loading-host .guide-loading-buffer-poster")).toHaveCount(1);
      results.push({ engine, fallback });
      await page.close();
    }
  } finally { await browser.close(); }
}
await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length, results }));
