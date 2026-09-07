import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/folder-paper-qa";
await fs.mkdir(output, { recursive: true });
const ids = ["module-2-inspection-paper", "module-2-production-paper"];
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium"
    ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const [width, height] of [[375, 812], [430, 932], [375, 667], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      try {
        await page.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 15000 });
        await expect(page.locator(".archive-folder-paper")).toHaveCount(2);
        const papers = [];
        for (const [index, id] of ids.entries()) {
          const paper = page.locator(`[data-paper-id="${id}"]`);
          const image = paper.locator("img");
          await expect(paper).toHaveAttribute("data-paper-state", "hidden");
          await expect(image).toHaveCSS("opacity", "0.5");
          const position = await paper.evaluate((node) => {
            const r = node.getBoundingClientRect();
            return { top: r.top + scrollY, left: r.left, width: r.width, height: r.height,
              initialOffset: node.querySelector("img").getBoundingClientRect().top - r.top };
          });
          expect(position.initialOffset / position.height).toBeCloseTo(index === 0 ? .22 : .18, 2);
          await page.evaluate((y) => scrollTo(0, y), position.top - height + 10);
          await expect(paper).toHaveAttribute("data-paper-state", "hidden");
          await page.screenshot({ path: `${output}/${engine}-${width}x${height}-${index}-hidden.png` });
          await paper.evaluate((node) => {
            window.__paperSamples = [];
            const image = node.querySelector("img");
            const sample = () => {
              const style = getComputedStyle(image);
              window.__paperSamples.push({ state: node.dataset.paperState, opacity: Number(style.opacity), y: new DOMMatrix(style.transform).m42, duration: style.transitionDuration });
              if (node.dataset.paperState !== "complete") requestAnimationFrame(sample);
            };
            sample();
          });
          await page.evaluate((y) => scrollTo(0, y), position.top - height * .65);
          await expect(paper).toHaveAttribute("data-paper-state", "entering");
          await expect.poll(() => image.evaluate((n) => Number(getComputedStyle(n).opacity))).toBeGreaterThan(.6);
          await page.screenshot({ path: `${output}/${engine}-${width}x${height}-${index}-entering.png` });
          await expect(paper).toHaveAttribute("data-paper-state", "complete");
          const measured = await paper.evaluate((node) => {
            const image = node.querySelector("img");
            const r = node.getBoundingClientRect(), a = image.getBoundingClientRect();
            return { samples: window.__paperSamples, src: image.getAttribute("src"), left: r.left, width: r.width, height: r.height,
              finalOffset: a.top - r.top, finalOpacity: getComputedStyle(image).opacity,
              stillBehindFolder: Number(getComputedStyle(node).zIndex) <= Number(getComputedStyle(node.nextElementSibling).zIndex) };
          });
          expect(measured.samples.some((s) => s.opacity > .05 && s.opacity < .9 && s.y > 0)).toBe(true);
          expect(measured.samples.find((s) => s.state === "entering").duration).toBe("0.672s, 0.672s");
          expect(measured.finalOffset).toBeCloseTo(0, 1);
          expect(measured.finalOpacity).toBe("1");
          expect(measured.left).toBeCloseTo(position.left, 1);
          expect(measured.width).toBeCloseTo(position.width, 1);
          expect(measured.height).toBeCloseTo(position.height, 1);
          expect(measured.stillBehindFolder).toBe(true);
          if (index === 0) await expect(page.locator(`[data-paper-id="${ids[1]}"]`)).toHaveAttribute("data-paper-state", "hidden");
          await page.screenshot({ path: `${output}/${engine}-${width}x${height}-${index}-complete.png` });
          // Also inspect the initial half-exposed pose in the same viewport as
          // the completed pose; normal scroll triggering has already finished.
          await paper.evaluate((node) => { node.dataset.paperState = "hidden"; });
          await page.screenshot({ path: `${output}/${engine}-${width}x${height}-${index}-half-exposed.png` });
          await paper.evaluate((node) => { node.dataset.paperState = "complete"; });
          papers.push({ id, ...measured });
        }
        await page.locator('[data-cue-slug="production-traceability"]').click();
        await expect(page).toHaveURL(`${base}/reports/production-traceability`, { timeout: 15000 });
        await expect(page.locator("#h5-category-route-loading-host")).toHaveAttribute("aria-hidden", "true", { timeout: 15000 });
        await page.goBack();
        for (const id of ids) await expect(page.locator(`[data-paper-id="${id}"]`)).toHaveAttribute("data-paper-state", "complete");
        results.push({ engine, width, height, papers, restored: true });
        await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`${engine}-${width}x${height}: passed`);
      } finally { await page.close(); }
    }
    const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
    await reduced.goto(`${base}/reports`, { waitUntil: "domcontentloaded" });
    await expect(reduced.locator(".archive-folder-paper")).toHaveCount(2);
    for (const id of ids) {
      const paper = reduced.locator(`[data-paper-id="${id}"]`);
      await expect(paper).toHaveAttribute("data-paper-state", "complete");
      await expect(paper.locator("img")).toHaveCSS("opacity", "1");
      await expect(paper.locator("img")).toHaveCSS("transform", "none");
    }
    results.push({ engine, reduced: true });
    await reduced.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length }));
