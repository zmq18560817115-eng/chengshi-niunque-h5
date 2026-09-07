import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.H5_QA_URL ?? "http://127.0.0.1:3100";
const output = `artifacts/ribbon-continuity-qa/${process.env.H5_QA_PHASE ?? "after"}`;
const cpuRate = Number(process.env.H5_QA_CPU_RATE ?? 1);
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.H5_QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await (engine === "chromium"
    ? chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }) : webkit.launch());
  try {
    for (const width of [375, 430]) {
      const page = await browser.newPage({ viewport: { width, height: width === 375 ? 812 : 932 }, isMobile: true, hasTouch: true });
      try {
        if (engine === "chromium" && cpuRate > 1) {
          const session = await page.context().newCDPSession(page);
          await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
        }
        await page.addInitScript(() => {
          window.__ribbonContinuity = [];
          const sample = (time) => {
            const buffer = document.querySelector("#h5-guide-route-buffer-host > .h5-guide-route-buffer.is-committing");
            const guide = buffer?.querySelector(".h5-guide-archive-entry-ribbon");
            const live = document.querySelector(".reports-archive .archive-unlock-tab-image");
            if (guide || live) {
              const bufferOpacity = buffer ? Number(getComputedStyle(buffer).opacity) : 0;
              const guideOpacity = guide ? Number(getComputedStyle(guide).opacity) : 0;
              const liveOpacity = live ? Number(getComputedStyle(live).opacity) : 0;
              window.__ribbonContinuity.push({ time, phase: document.documentElement.getAttribute("data-guide-route-entry"),
                bufferOpacity, guideOpacity, liveOpacity, liveState: live?.closest(".archive-unlock-tab-motion").dataset.unlockState,
                guideX: guide?.getBoundingClientRect().x, liveX: live?.getBoundingClientRect().x,
                visibleOpacity: bufferOpacity * guideOpacity + (1 - bufferOpacity) * liveOpacity });
            }
            if (window.__ribbonContinuity.length < 600) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        await page.goto(`${base}/go`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 15000 });
        await page.getByRole("button", { name: "进入档案" }).click();
        await expect(page.locator(".reports-archive")).toHaveAttribute("data-guide-entry", "complete", { timeout: 15000 });
        await expect(page.locator(".reports-archive .archive-unlock-tab-motion")).toHaveAttribute("data-unlock-state", "fixed");
        const samples = await page.evaluate(() => window.__ribbonContinuity);
        const fading = samples.filter((sample) => sample.phase === "revealing" && sample.bufferOpacity < .95);
        const firstVisible = samples.findIndex((sample) => sample.visibleOpacity > .2);
        const visible = samples.slice(firstVisible);
        const biggestOpacityDrop = Math.max(0, ...visible.slice(1).map((sample, index) => visible[index].visibleOpacity - sample.visibleOpacity));
        let peakOpacity = 0;
        const maximumFadeLoss = Math.max(0, ...visible.map((sample) => { peakOpacity = Math.max(peakOpacity, sample.visibleOpacity); return peakOpacity - sample.visibleOpacity; }));
        const result = { engine, width, cpuRate, biggestOpacityDrop, maximumFadeLoss, hiddenLiveDuringFade: fading.some((sample) => sample.liveState === "hidden"), samples };
        results.push(result);
        await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
        await page.screenshot({ path: `${output}/${engine}-${width}-settled.png` });
        console.log(JSON.stringify({ ...result, samples: undefined }));
        if (process.env.H5_QA_PHASE !== "before") {
          expect(result.hiddenLiveDuringFade, "the live ribbon must already be moving beneath the crossfade").toBe(false);
          expect(biggestOpacityDrop, "the ribbon must not fade out and reappear at handoff").toBeLessThan(.05);
          expect(maximumFadeLoss, "opacity must continue increasing through the crossfade").toBeLessThan(.05);
          const overlap = fading.filter((sample) => sample.guideOpacity > .2 && sample.liveOpacity > .2);
          expect(overlap.length).toBeGreaterThan(2);
          expect(Math.max(...overlap.map((sample) => Math.abs(sample.guideX - sample.liveX))), "both surfaces share the same animation position").toBeLessThan(2);
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ passed: results.length }));
