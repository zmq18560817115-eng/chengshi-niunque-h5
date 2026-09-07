import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = path.resolve("artifacts/category-edge-qa");
await fs.mkdir(output, { recursive: true });
const results = [];
const slugs = ["inspection-projects", "review-assurance", "production-traceability"];
const sizes = [[320,568],[375,668],[390,692],[390,694],[390,740],[408,805],[390,932],[390,1080],[430,932],[750,1334],[844,390]];
for (const [engine, launcher] of [["chromium",chromium],["webkit",webkit]]) {
  const browser = await launcher.launch({ headless: true, ...(engine === "chromium" ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 932 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const slug of slugs) {
      await page.goto(`${base}/reports/${slug}`, { waitUntil: "networkidle" });
      await page.evaluate(async () => Promise.all([...document.images].map((image) => image.decode())));
      for (const [width,height] of sizes) {
        await page.setViewportSize({width,height});
        await expect.poll(() => page.locator(".category-page-final").evaluate((node) => Math.round(node.getBoundingClientRect().height))).toBe(height);
        await page.locator(".category-page-scroll-region").evaluate((node) => { node.scrollTop = 0; });
        const metrics = await page.evaluate(() => {
          const rect = (selector) => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
          };
          const region=document.querySelector(".category-page-scroll-region");
          return { viewport:[innerWidth,innerHeight], stage:rect(".category-page-final"), canvas:rect(".category-page-viewport"),
            sheet:rect(".category-page-sheet"),tail:rect(".category-page-tail"),card:rect(".category-card-hotspot"),
            tailImage:getComputedStyle(document.querySelector(".category-page-tail")).backgroundImage,
            overflow:getComputedStyle(region).overflowY,scrollHeight:region.scrollHeight,
            horizontalOverflow:document.documentElement.scrollWidth>innerWidth };
        });
        expect(metrics.canvas.width, `${engine}/${slug}/${width}x${height}`).toBeCloseTo(Math.min(width,750),1);
        expect(metrics.canvas.x).toBeCloseTo((width-Math.min(width,750))/2,1);
        expect(metrics.canvas.height/metrics.canvas.width).toBeCloseTo(4333/2000,3);
        expect(metrics.sheet.bottom).toBeGreaterThanOrEqual(metrics.stage.bottom-1);
        expect(metrics.tail.bottom).toBeGreaterThanOrEqual(metrics.stage.bottom-1);
        expect(metrics.tail.height).toBeCloseTo(Math.max(0,height-metrics.canvas.height),0);
        expect(metrics.tailImage).toContain("-page-tail.webp");
        expect(metrics.overflow).toBe("auto");
        expect(metrics.horizontalOverflow).toBe(false);
        const scroll=await page.locator(".category-page-scroll-region").evaluate((node) => {
          node.scrollTop=node.scrollHeight;
          return {actual:node.scrollTop,expected:Math.max(0,node.scrollHeight-node.clientHeight)};
        });
        expect(scroll.actual).toBeCloseTo(scroll.expected,0);
        await page.screenshot({path:path.join(output,`${engine}-${slug}-${width}x${height}-bottom.png`)});
        results.push({engine,slug,...metrics,scroll});
      }
    }
    // A WebView can change its visible height before the layout viewport
    // changes. Simulate that event while keeping the artwork's width fixed.
    await page.setViewportSize({width:390,height:932});
    await page.evaluate(() => {
      Object.defineProperty(visualViewport,"height",{configurable:true,value:740});
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await expect.poll(() => page.locator(".category-page-final").evaluate((node) => Math.round(node.getBoundingClientRect().height))).toBe(740);
    expect((await page.locator(".category-page-viewport").boundingBox()).width).toBeCloseTo(390,1);
    expect(errors).toEqual([]);
    await page.close();
  } finally { await browser.close(); }
}
await fs.writeFile(path.join(output,"after.json"),JSON.stringify(results,null,2));
console.log(JSON.stringify({checked:results.length,engines:2,visualViewportResize:"passed",output}));
