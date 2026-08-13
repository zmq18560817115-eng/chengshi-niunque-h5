import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("test-results/archive-clean-motion");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const viewports = [[375,812],[390,844],[414,896]];
const results = [];

for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
  await context.addInitScript(() => sessionStorage.clear());
  const guide = await context.newPage();
  await guide.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await guide.screenshot({ path: path.join(output, `${width}-guide-start.png`) });
  await guide.waitForTimeout(700);
  await guide.screenshot({ path: path.join(output, `${width}-guide-middle.png`) });
  await guide.waitForTimeout(900);
  await guide.screenshot({ path: path.join(output, `${width}-guide-final.png`) });
  await guide.close();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("http://127.0.0.1:3000/reports", { waitUntil: "networkidle" });
  await page.locator(".reports-archive-clean-base").waitFor();
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    baseWidth: Math.round(document.querySelector(".reports-archive-clean-base")?.getBoundingClientRect().width ?? 0),
    fishMotionSources: new Set([...document.querySelectorAll(".archive-fish-float-layer")].map((node) => node.getAttribute("src"))).size,
    resultMotionSources: new Set([...document.querySelectorAll(".archive-result-color-passed")].map((node) => node.getAttribute("src"))).size,
    unlockMotionSources: new Set([...document.querySelectorAll(".archive-unlock-tab-image.is-moving")].map((node) => node.getAttribute("src"))).size,
    unlockState: document.querySelector(".archive-unlock-tab-motion")?.getAttribute("data-unlock-state"),
  }));
  await page.screenshot({ path: path.join(output, `${width}-start.png`), fullPage: true });
  await page.evaluate(() => window.scrollTo({ top: 1050, behavior: "instant" }));
  await page.mouse.wheel(0, 48);
  await page.waitForTimeout(360);
  await page.screenshot({ path: path.join(output, `${width}-middle.png`), fullPage: true });
  await page.waitForTimeout(1050);
  await page.evaluate(() => window.scrollTo({ top: 4300, behavior: "instant" }));
  await page.mouse.wheel(0, 48);
  await page.waitForTimeout(850);
  await page.screenshot({ path: path.join(output, `${width}-final.png`), fullPage: true });
  results.push({ width, height, status: response?.status(), errors, ...metrics, horizontalOverflow: metrics.scrollWidth > metrics.viewportWidth });
  await context.close();
}

await browser.close();
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status !== 200 || result.errors.length || result.horizontalOverflow || result.fishMotionSources !== 4 || result.resultMotionSources !== 1 || result.unlockMotionSources !== 1)) process.exitCode = 1;
