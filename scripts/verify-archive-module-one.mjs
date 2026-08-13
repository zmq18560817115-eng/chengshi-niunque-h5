import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("test-results/archive-module-1");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const viewports = [[320,568],[360,800],[375,667],[375,812],[390,844],[393,852],[414,896],[430,932]];
const results = [];

for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
  await context.addInitScript(() => sessionStorage.removeItem("archive-module-1-complete"));
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/reports", { waitUntil: "networkidle" });
  await page.locator(".archive-module-one.is-ready").waitFor();
  await page.evaluate(() => document.querySelector(".archive-module-one")?.classList.add("is-started"));
  const measure = await page.evaluate(() => {
    const stage = document.querySelector(".reports-archive");
    const layer = document.querySelector(".archive-module-one");
    const art = document.querySelector(".reports-archive-art");
    return { bodyScrollWidth: document.body.scrollWidth, innerWidth, stageWidth: stage?.getBoundingClientRect().width, layerWidth: layer?.getBoundingClientRect().width, artWidth: art?.getBoundingClientRect().width };
  });
  results.push({ width, height, ...measure, horizontalOverflow: measure.bodyScrollWidth > width });
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 1000, height: 2020 }, reducedMotion: "no-preference" });
await context.addInitScript(() => {
  sessionStorage.removeItem("archive-module-1-complete");
  class FrozenIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = FrozenIntersectionObserver;
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:3000/reports", { waitUntil: "networkidle" });
await page.locator(".archive-module-one.is-ready").waitFor();
const layer = page.locator(".archive-module-one");
await layer.screenshot({ path: path.join(output, "animation-start.png") });
await page.evaluate(() => document.querySelector(".archive-module-one")?.classList.add("is-started"));
await page.waitForTimeout(1050);
await layer.screenshot({ path: path.join(output, "animation-middle.png") });
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 100));
await page.waitForTimeout(100);
await layer.screenshot({ path: path.join(output, "animation-final.png") });
await fs.writeFile(path.join(output, "viewport-results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await context.close();
await browser.close();
