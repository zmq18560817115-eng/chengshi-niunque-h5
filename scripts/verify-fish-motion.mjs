import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = path.resolve("artifacts/asset-refresh/fish-motion");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
try {
  for (const width of [375, 750]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } });
    await page.goto(`${base}/reports`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
    await page.locator(".archive-fish-float-trigger").scrollIntoViewIfNeeded();
    await expect(page.locator(".archive-fish-float")).toHaveAttribute("data-fish-ready", "true");
    await expect(page.locator(".archive-fish-motion-gif")).toHaveCount(4);
    const motion = await page.evaluate(async () => {
      const fish = [...document.querySelectorAll(".archive-fish-motion-gif")];
      const cue = document.querySelector(".archive-section-click-cue-image");
      const sample = () => fish.map((node) => {
        const style = getComputedStyle(node);
        const m = new DOMMatrixReadOnly(style.transform);
        return { angle: Math.atan2(m.b, m.a) * 180 / Math.PI, x: m.e, y: m.f };
      });
      const samples = [];
      for (let i = 0; i < 13; i++) {
        samples.push(sample());
        await new Promise((resolve) => setTimeout(resolve, 160));
      }
      return {
        durations: fish.map((node) => getComputedStyle(node).animationDuration),
        cueDuration: getComputedStyle(cue).animationDuration,
        angles: fish.map((_, index) => {
          const angles = samples.map((sample) => sample[index].angle);
          return Math.max(...angles) - Math.min(...angles);
        }),
        samples,
        stationaryBacking: getComputedStyle(document.querySelector(".archive-fish-clean-patch")).transform,
      };
    });
    expect(motion.cueDuration).toBe("1.8s");
    expect(motion.durations.every((duration) => duration === motion.cueDuration)).toBe(true);
    expect(motion.angles.every((range) => range > 12)).toBe(true);
    expect(motion.stationaryBacking).toBe("none");

    // Freeze the existing CSS animations at their two original poses for QA.
    const poses = [];
    for (const at of [0, 900]) {
      await page.locator(".archive-fish-motion-gif").evaluateAll((nodes, time) => nodes.forEach((node) => {
        const animation = node.getAnimations()[0];
        animation.pause(); animation.currentTime = time;
      }), at);
      const trigger = await page.locator(".archive-fish-float-trigger").boundingBox();
      const clip = { x: 0, y: Math.max(0, trigger.y - 18), width, height: trigger.height + 36 };
      await page.screenshot({ path: path.join(output, `fish-${width}-pose-${at}.png`), clip });
      // The leftmost original bubble is clear of all moving fish.
      const pixels = await page.evaluate(() => {
        const image = document.querySelector(".archive-fish-clean-patch");
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext("2d").drawImage(image, 0, 0);
        return canvas.toDataURL();
      });
      poses.push(pixels);
    }
    expect(poses[0]).toBe(poses[1]);
    results.push({ width, ...motion });
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator(".archive-fish-float")).toHaveAttribute("data-fish-visible", "false");
    await expect(page.locator(".archive-fish-motion-gif")).toHaveCount(0);
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  await reduced.goto(`${base}/reports`, { waitUntil: "networkidle" });
  await reduced.locator(".archive-fish-float-trigger").scrollIntoViewIfNeeded();
  await expect(reduced.locator(".archive-fish-motion-gif")).toHaveCount(0);
  await reduced.close();
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, reducedMotion: "passed", output }));
} finally {
  await browser.close();
}
