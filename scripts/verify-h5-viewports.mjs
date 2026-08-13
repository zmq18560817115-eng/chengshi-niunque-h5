import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const viewports = [[320,568],[360,800],[375,812],[390,844],[393,852],[414,896],[430,932]];
const routes = [
  ["guide", "/"],
  ["archive", "/reports"],
  ["inspection", "/reports/inspection-projects"],
  ["review", "/reports/review-assurance"],
  ["traceability", "/reports/production-traceability"],
  ["report", "/reports/inspection-projects/items/seed-card-inspection-nutrition/reports"],
];
const output = path.resolve("test-results/h5-regression-v1");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
for (const [width, height] of viewports) {
  for (const [name, route] of routes) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      shellWidth: Math.round(document.querySelector(".h5-shell, .brand-guide")?.getBoundingClientRect().width ?? 0),
      animationState: document.querySelector("[data-animation-state]")?.getAttribute("data-animation-state") ?? null,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
    }));
    results.push({ width, height, name, route, status: response?.status(), errors, ...metrics, horizontalOverflow: metrics.scrollWidth > metrics.viewportWidth });
    await page.close();
  }
}
await browser.close();
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
const failures = results.filter((item) => item.status !== 200 || item.errors.length || item.horizontalOverflow || item.brokenImages || item.shellWidth !== item.viewportWidth);
console.log(JSON.stringify({ checked: results.length, failures, widths: viewports.map(([width]) => width) }, null, 2));
if (failures.length) process.exitCode = 1;
