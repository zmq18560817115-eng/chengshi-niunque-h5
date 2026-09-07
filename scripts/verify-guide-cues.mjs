import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/guide-cues-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium" ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const [width, height] of [[375, 812], [430, 932], [375, 667]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "no-preference" });
      let releasePaper;
      const paperGate = new Promise((resolve) => { releasePaper = resolve; });
      await page.route("**/guide/report-paper-bottom.webp", async (route) => { await paperGate; await route.continue(); });
      await page.goto(`${base}/go`, { waitUntil: "domcontentloaded" });
      const hint = page.locator(".brand-guide-entry-hint");
      await expect.poll(() => hint.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
      await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-load-state", "loading");
      await expect(hint).toHaveCSS("opacity", "0");
      expect((await hint.boundingBox()).y).toBeGreaterThanOrEqual(height);
      await page.screenshot({ path: `${output}/${engine}-${width}x${height}-hint-loading.png` });
      releasePaper();
      await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-animation-state", "running", { timeout: 15000 });
      await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-swipe-state", "ready");
      await expect(hint).toBeVisible();
      await expect(hint).toHaveCSS("animation-name", "guide-entry-hint-enter");
      await page.screenshot({ path: `${output}/${engine}-${width}x${height}-hint-animating.png` });
      await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 15000 });
      await page.getByRole("button", { name: "进入档案" }).click();
      await expect(page).toHaveURL(`${base}/reports`, { timeout: 15000 });
      await expect(page.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
      await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
      await expect(page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer")).toHaveCount(0, { timeout: 15000 });
      const cue = page.locator('[data-cue-module="review-assurance"]');
      await cue.scrollIntoViewIfNeeded();
      await expect(page.locator(".archive-section-title-motion")).toHaveAttribute("data-title-sequence-running", "true");
      const rest = await page.locator(".archive-section-click-cue-image").evaluateAll((nodes) => nodes.map((node) => {
        const animation = node.getAnimations()[0];
        animation.pause(); animation.currentTime = 0;
        const r = node.getBoundingClientRect();
        const group = node.closest("[data-title-group]");
        const titleTop = Math.min(...[...group.querySelectorAll(".archive-section-character-slot")].map((part) => part.getBoundingClientRect().top));
        const hotspot = document.querySelector(`[data-cue-slug="${group.dataset.titleGroup}"]`).getBoundingClientRect();
        return { slug: group.dataset.titleGroup, top: r.top, height: r.height, gap: titleTop - r.bottom, targetTop: hotspot.top, duration: getComputedStyle(node).animationDuration };
      }));
      await page.screenshot({ path: `${output}/${engine}-${width}x${height}-arrows-rest.png` });
      const peak = await page.locator(".archive-section-click-cue-image").evaluateAll((nodes) => nodes.map((node) => { node.getAnimations()[0].currentTime = 900; return node.getBoundingClientRect().top; }));
      for (const [index, item] of rest.entries()) {
        expect(item.duration).toBe("1.8s");
        expect(Math.abs(item.top - peak[index] - item.height * .24)).toBeLessThan(.2);
        expect(item.top - peak[index]).toBeGreaterThan(9);
        expect(item.targetTop).toBeCloseTo(item.top, 1);
      }
      expect(Math.max(...rest.map((r) => r.gap)) - Math.min(...rest.map((r) => r.gap))).toBeLessThan(2);
      await page.screenshot({ path: `${output}/${engine}-${width}x${height}-arrows-peak.png` });
      await page.locator('[data-cue-slug="review-assurance"]').click();
      await expect(page).toHaveURL(`${base}/reports/review-assurance`, { timeout: 15000 });
      results.push({ engine, width, height, hintStartsBelowViewport: true, entryDuringAnimation: true, reviewArrowLink: true, rest, lift: rest.map((item, i) => item.top - peak[i]) });
      await fs.writeFile(`${output}/${engine}-results.json`, JSON.stringify(results.filter((result) => result.engine === engine), null, 2));
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    await reduced.goto(`${base}/reports`, { waitUntil: "networkidle" });
    await reduced.locator('[data-cue-module="review-assurance"]').scrollIntoViewIfNeeded();
    await expect(reduced.locator(".archive-section-click-cue-image").first()).toHaveCSS("animation-name", "none");
    results.push({ engine, reducedMotion: true });
  } finally { await browser.close(); }
}
await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length, results }));
