import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = path.resolve("artifacts/mobile-adaptation-750");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const slugs = ["inspection-projects", "review-assurance", "production-traceability"];
const results = [];
try {
  for (const [width, height] of [[320,568], [375,668], [390,844], [430,932], [750,1334]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/examples/vw-card/index.html`);
    const card = await page.locator(".mobile-card").boundingBox();
    expect(card.width).toBeCloseTo(width * 200 / 750, 1);
    expect(card.height).toBeCloseTo(width * 100 / 750, 1);
    expect(await page.locator('meta[name="viewport"]').count()).toBe(1);
    results.push({ width, height, example: card });
    for (const slug of slugs) {
      await page.goto(`${base}/reports/${slug}`, { waitUntil: "networkidle" });
      await expect(page.locator(".category-card-hotspot").first()).toBeVisible();
      await page.evaluate(async () => Promise.all([...document.images].map((image) => image.decode())));
      expect(await page.locator('meta[name="viewport"]').count()).toBe(1);
      const cards = await page.locator(".category-card-hotspot").evaluateAll((nodes) => nodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        const parts = [...node.querySelectorAll("[data-card-part]")].map((part) => {
          const box = part.getBoundingClientRect();
          return { role: part.dataset.cardPart, src: part.getAttribute("src"), x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        });
        return { id: node.dataset.cardId, title: node.querySelector("strong").textContent, description: node.querySelector("small").textContent,
          titleIsSource: node.querySelector("strong").classList.contains("is-source-copy"), descriptionIsSource: node.querySelector("small").classList.contains("is-source-copy"),
          bounds: { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom }, parts };
      }));
      expect(cards).toHaveLength(slug === "production-traceability" ? 2 : 3);
      for (const card of cards) {
        expect(card.titleIsSource && card.descriptionIsSource, `${slug}/${card.id}: stale copy must not override approved artwork`).toBe(true);
        for (const part of card.parts) {
          expect(part.x).toBeGreaterThanOrEqual(card.bounds.x - 1);
          expect(part.right).toBeLessThanOrEqual(card.bounds.right + 1);
          expect(part.y).toBeGreaterThanOrEqual(card.bounds.y - 1);
          expect(part.bottom).toBeLessThanOrEqual(card.bounds.bottom + 1);
        }
        const title = card.parts.find((part) => part.role === "title");
        const description = card.parts.find((part) => part.role === "description");
        const button = card.parts.find((part) => part.role === "control-0");
        if (description) { expect(description.y).toBeGreaterThan(title.bottom); expect(description.bottom).toBeLessThan(button.y); }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: path.join(output, `${slug}-${width}.png`) });
      const scroll = await page.locator(".category-page-scroll-region").evaluate((node) => {
        node.scrollTop = node.scrollHeight;
        return { actual: node.scrollTop, expected: Math.max(0, node.scrollHeight - node.clientHeight) };
      });
      expect(scroll.actual).toBeCloseTo(scroll.expected, 0);
      results.push({ width, height, slug, cards, scroll });
      if (width === 375) {
        for (const card of cards) {
          await page.goto(`${base}/reports/${slug}`, { waitUntil: "networkidle" });
          await page.locator(`[data-card-id="${card.id}"]`).click();
          await expect(page).toHaveURL(`${base}/reports/${slug}/items/${card.id}/reports`);
          await expect(page.locator(".report-page-title h1")).toHaveText(card.title);
          if (card.description) await expect(page.locator(".report-page-title div")).toHaveText(card.description);
        }
      }
    }
    expect(errors).toEqual([]);
    await page.close();
  }
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, output }));
} finally { await browser.close(); }
