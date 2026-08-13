import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("test-results/static-visual-v1");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const pages = [
  ["guide", "/"],
  ["archive", "/reports"],
  ["inspection", "/reports/inspection-projects"],
  ["review", "/reports/review-assurance"],
  ["traceability", "/reports/production-traceability"],
];
const results = [];
for (const [name, route] of pages) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(output, `${name}-actual.png`), fullPage: true });
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    shellWidth: Math.round(document.querySelector(".h5-shell, .brand-guide")?.getBoundingClientRect().width ?? 0),
    animationState: document.querySelector("[data-animation-state]")?.getAttribute("data-animation-state") ?? null,
  }));
  results.push({ name, route, status: response?.status(), errors, ...metrics, horizontalOverflow: metrics.scrollWidth > metrics.viewportWidth });
  await page.close();
}
await browser.close();
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
