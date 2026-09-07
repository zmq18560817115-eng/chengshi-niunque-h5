import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = "artifacts/guide-hint-entry-qa";
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium"
    ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const [width, height] of [[375, 812], [430, 932], [375, 667], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const landscape = width > height;
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route(landscape ? "**/guide/guide-character-open.webp" : "**/guide/report-paper-bottom.webp", async (route) => { await gate; await route.continue().catch(() => {}); });
      try {
        await page.goto(`${base}/go`, { waitUntil: "domcontentloaded" });
        const hint = page.locator(landscape ? ".brand-guide .guide-landscape-hint" : ".brand-guide-entry-hint");
        await expect(hint).toHaveCount(1);
        await expect.poll(() => hint.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
        await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-load-state", "loading");
        await expect(hint).toHaveCSS("opacity", "0");
        const initial = await hint.boundingBox();
        expect(initial.y).toBeGreaterThanOrEqual(height);
        await page.screenshot({ path: `${output}/${engine}-${width}x${height}-initial.png` });
        await hint.evaluate((node) => {
          window.__hintSamples = [];
          const sample = () => {
            if (!node.isConnected) return;
            const style = getComputedStyle(node);
            const animation = node.getAnimations()[0];
            window.__hintSamples.push({ y: node.getBoundingClientRect().y, opacity: Number(style.opacity), animation: style.animationName, duration: style.animationDuration, time: animation?.currentTime ?? null });
            if (animation?.playState !== "finished") requestAnimationFrame(sample);
          };
          sample();
        });
        release();
        await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-animation-state", "running", { timeout: 15000 });
        await expect(hint).toHaveCSS("animation-name", "guide-entry-hint-enter");
        await expect.poll(() => hint.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.3);
        await page.screenshot({ path: `${output}/${engine}-${width}x${height}-entering.png` });
        await expect(hint).toHaveCSS("opacity", "1");
        const final = await hint.boundingBox();
        const animation = await hint.evaluate((node) => {
          const style = getComputedStyle(node);
          const active = node.getAnimations()[0];
          return { duration: style.animationDuration, iterations: style.animationIterationCount, playState: active.playState, samples: window.__hintSamples,
            bottom: parseFloat(style.bottom), artworkBottom: node.closest(".brand-guide-artwork").getBoundingClientRect().bottom };
        });
        expect(animation.duration).toBe("0.9s");
        expect(animation.iterations).toBe("1");
        expect(animation.playState).toBe("finished");
        expect(animation.samples.some((s) => s.opacity > 0 && s.opacity < 1 && s.y > final.y + 1 && s.y < initial.y)).toBe(true);
        expect(final.y + final.height).toBeLessThanOrEqual(height);
        expect(final.y + final.height + animation.bottom).toBeCloseTo(animation.artworkBottom, 0);
        await page.screenshot({ path: `${output}/${engine}-${width}x${height}-settled.png` });
        const settled = await hint.boundingBox();
        expect(settled.y).toBeCloseTo(final.y, 2);
        await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled();
        await page.getByRole("button", { name: "进入档案" }).click();
        await expect(page).toHaveURL(`${base}/reports`, { timeout: 15000 });
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
        results.push({ engine, width, height, initial, final, animation, entered: true });
        await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`${engine}-${width}x${height}: passed`);
      } finally { release(); await page.close(); }
    }
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, reducedMotion: "reduce" });
    await page.goto(`${base}/go`, { waitUntil: "domcontentloaded" });
    const hint = page.locator(".brand-guide .guide-landscape-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toHaveCSS("animation-name", "none");
    await expect(hint).toHaveCSS("opacity", "1");
    results.push({ engine, reducedMotion: true });
    await page.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.length }));
