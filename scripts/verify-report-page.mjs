import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("test-results/report-page-v1");
await fs.mkdir(output, { recursive: true });
const viewports = [[320,568],[360,800],[375,667],[375,812],[390,844],[393,852],[414,896],[430,932]];
const routes = [
  ["inspection", "/reports/inspection-projects/items/seed-card-inspection-nutrition/reports"],
  ["review", "/reports/review-assurance/items/seed-card-review-standard/reports"],
  ["traceability", "/reports/production-traceability/items/seed-card-traceability-origin/reports"],
];
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
for (const [width, height] of viewports) {
  for (const [name, route] of routes) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle" });
    await page.locator(".report-page-final").waitFor();
    const metrics = await page.evaluate(() => ({
      theme: document.querySelector(".report-page-final")?.getAttribute("data-theme"),
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      pageHeight: document.documentElement.scrollHeight,
      images: [...document.querySelectorAll(".report-image-stage img")].map((image) => ({ width: image.getBoundingClientRect().width, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
      minButton: Math.min(...[...document.querySelectorAll("button, a")].map((element) => Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height)).filter(Boolean)),
    }));
    results.push({ width, height, name, route, ...metrics, horizontalOverflow: metrics.bodyWidth > metrics.viewportWidth });
    if ((width === 320 || width === 390 || width === 430) && name === "inspection") await page.screenshot({ path: path.join(output, `${name}-${width}x${height}.png`), fullPage: true });
    await page.close();
  }
}
await browser.close();
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
