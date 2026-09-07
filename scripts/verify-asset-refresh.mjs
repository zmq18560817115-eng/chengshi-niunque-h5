import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3000";
const output = path.resolve("artifacts/asset-refresh/browser");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
const slugs = ["inspection-projects", "review-assurance", "production-traceability"];
try {
  for (const [width, height] of [[375, 812], [390, 844], [428, 926], [320, 568], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    const legacyRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/design/") && !pathname.startsWith("/design/2026-09-07/") && !pathname.startsWith("/design/reports/")) legacyRequests.push(pathname);
    });
    for (const [name, route] of [["guide", "/go"], ["archive", "/reports"], ...slugs.map((slug) => [slug, `/reports/${slug}`])]) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      if (name === "guide") await expect(page.locator(".brand-guide")).toBeVisible();
      else if (name === "archive") await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
      else await expect(page.locator(".category-card-hotspot").first()).toBeVisible();
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      });
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        broken: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
        titleParts: document.querySelectorAll("[data-title-character]").length,
        cues: document.querySelectorAll("[data-cue-module]").length,
      }));
      expect(metrics.overflow).toBe(false);
      expect(metrics.broken).toEqual([]);
      if (name === "archive") { expect(metrics.titleParts).toBe(15); expect(metrics.cues).toBe(3); }
      await page.screenshot({ path: path.join(output, `${name}-${width}x${height}.png`), fullPage: true });
      results.push({ name, width, height, ...metrics });
    }
    expect(errors).toEqual([]);
    expect(legacyRequests).toEqual([]);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${base}/go`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "进入档案", exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "进入档案", exact: true }).click();
  await expect(page).toHaveURL(`${base}/reports`, { timeout: 30000 });
  await expect(page.locator('[data-archive-artwork-ready="true"]')).toBeVisible({ timeout: 30000 });
  for (const slug of slugs) {
    if (new URL(page.url()).pathname !== "/reports") await page.goto(`${base}/reports`, { waitUntil: "networkidle" });
    const cue = page.locator(`[data-cue-slug="${slug}"]`);
    await cue.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-title-sequence-running="true"]')).toBeAttached();
    const timing = await page.locator(`[data-title-group="${slug}"]`).evaluate((group) => ({
      characters: [...group.querySelectorAll("[data-title-character]")].map((part) => ({ duration: getComputedStyle(part).animationDuration, delay: getComputedStyle(part).animationDelay, running: getComputedStyle(part).animationPlayState })),
      cue: getComputedStyle(group.querySelector(".archive-section-click-cue-image")).animationDuration,
    }));
    expect(timing.cue).toBe("1.8s");
    expect(timing.characters).toHaveLength(5);
    expect(new Set(timing.characters.map((part) => part.delay)).size).toBe(5);
    expect(timing.characters.every((part) => part.duration === "3.651s" && part.running === "running")).toBe(true);
    await cue.click();
    await expect(page).toHaveURL(`${base}/reports/${slug}`, { timeout: 30000 });
    const card = page.locator(".category-card-hotspot").first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/reports/${slug}/items/[^/]+/reports$`), { timeout: 30000 });
    await expect(page.locator(".report-page-final")).toBeVisible();
    results.push({ name: "interactive-route", slug, timing });
  }
  await page.close();
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, output }));
} finally {
  await browser.close();
}
