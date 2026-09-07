import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3000";
const output = path.resolve("artifacts/asset-refresh/parts-qa");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
const points = [[1700,1200,"inspection-projects"],[100,1100,null],[100,1500,"inspection-projects"],[500,1950,"review-assurance"],[100,2300,"review-assurance"],[1500,2700,"production-traceability"],[100,2530,"review-assurance"],[1000,3500,"production-traceability"]];
try {
  for (const width of [375, 750]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } });
    await page.goto(`${base}/reports`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
    const hitResults = [];
    for (const [x, y, expected] of points) {
      const hit = await page.evaluate(({ x, y }) => {
        const canvas = document.querySelector(".reports-archive-canvas");
        const bounds = canvas.getBoundingClientRect();
        const scale = bounds.width / 2000;
        const docY = bounds.top + scrollY + (3733 + y) * scale;
        scrollTo(0, docY - 350);
        const node = document.elementFromPoint(bounds.left + x * scale, docY - scrollY);
        return node?.closest("[data-slug]")?.getAttribute("data-slug") ?? null;
      }, { x, y });
      expect(hit, `source point ${x},${y} at ${width}px`).toBe(expected);
      hitResults.push({ x, y, hit });
    }

    // The entire purple asset has fixed document coordinates before/after
    // wheel input, with no independent reveal or viewport positioning.
    const ribbonState = () => page.locator(".archive-unlock-tab-clip").evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, docY: r.y + scrollY, width: r.width, height: r.height, clip: getComputedStyle(node).clipPath };
    });
    await page.evaluate(() => scrollTo(0, 200));
    const before = await ribbonState();
    await page.mouse.wheel(0, 160);
    await expect.poll(async () => (await ribbonState()).y).toBeLessThan(before.y - 100);
    const after = await ribbonState();
    expect(after.docY).toBeCloseTo(before.docY, 2);
    expect(after.height).toBeCloseTo(before.height, 2);
    expect(after.clip).toBe("none");

    const folder = page.locator('[data-slug="review-assurance"]');
    await folder.scrollIntoViewIfNeeded();
    const source = page.locator('[data-source-part="module-2-review-folder"]');
    const boundsBefore = await source.boundingBox();
    await folder.dispatchEvent("pointerdown");
    await page.waitForTimeout(100);
    expect(await source.boundingBox()).toEqual(boundsBefore);
    expect(await folder.evaluate((node) => ({ background: getComputedStyle(node).backgroundColor, shadow: getComputedStyle(node).boxShadow }))).toEqual({ background: "rgba(0, 0, 0, 0)", shadow: "none" });
    await page.screenshot({ path: path.join(output, `folder-pressed-${width}.png`) });
    await folder.dispatchEvent("pointercancel");
    results.push({ width, hitResults, ribbon: { before, after }, pressedGeometryStable: true });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${base}/reports`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
  const story = page.locator(".archive-story-copy");
  await page.mouse.wheel(0, 1450);
  await expect(story).toHaveAttribute("data-motion-started", "true");
  await expect(story).toHaveAttribute("data-motion-ready", "true");
  const frames = await page.locator(".archive-story-copy-line").evaluateAll((lines) => lines.map((line) => {
    const animation = line.getAnimations()[0];
    animation?.pause();
    if (animation) animation.currentTime = 0;
    return { src: line.getAttribute("src"), delay: getComputedStyle(line).animationDelay, duration: getComputedStyle(line).animationDuration };
  }));
  expect(frames).toHaveLength(7);
  expect(new Set(frames.map((frame) => frame.delay)).size).toBe(7);
  expect(frames.every((frame) => frame.duration === "0.9s")).toBe(true);
  expect(await page.locator(".archive-story-copy-clean-patch").count()).toBe(0);
  await page.screenshot({ path: path.join(output, "story-before-text.png") });
  await page.locator(".archive-story-copy-line").evaluateAll((lines) => lines.forEach((line) => { const animation = line.getAnimations()[0]; if (animation) animation.currentTime = 1200; }));
  await page.screenshot({ path: path.join(output, "story-during-text.png") });
  await page.locator(".archive-story-copy-line").evaluateAll((lines) => lines.forEach((line) => { const animation = line.getAnimations()[0]; if (animation) animation.currentTime = 2350; }));
  await page.screenshot({ path: path.join(output, "story-complete.png") });
  results.push({ storyFrames: frames });

  // Click the actual coloured surfaces, rather than the separate arrow cues.
  for (const [x, y, slug] of [[100,1500,"inspection-projects"],[100,2300,"review-assurance"],[1000,3500,"production-traceability"]]) {
    await page.goto(`${base}/reports`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
    const target = await page.evaluate(({ x, y }) => {
      const r = document.querySelector(".reports-archive-canvas").getBoundingClientRect();
      const docY = r.top + scrollY + (3733 + y) * r.width / 2000;
      scrollTo(0, docY - 350);
      return { x: r.left + x * r.width / 2000, y: docY - scrollY };
    }, { x, y });
    await page.mouse.click(target.x, target.y);
    await expect(page).toHaveURL(`${base}/reports/${slug}`, { timeout: 30000 });
    results.push({ colouredSurfaceRoute: slug });
  }
  await page.close();
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, output }));
} finally {
  await browser.close();
}
