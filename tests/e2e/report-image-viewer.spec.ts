import { expect, test, type Page } from "@playwright/test";

test.use({ browserName: "chromium", hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

const reportPages = [
  "/reports/inspection-projects/items/placeholder-slot-3/reports",
  "/reports/review-assurance/items/placeholder-slot-1/reports",
  "/reports/production-traceability/items/placeholder-slot-1/reports",
];

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
  for (let index = 1; index <= 8; index += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
      x: from.x + (to.x - from.x) * index / 8,
      y: from.y + (to.y - from.y) * index / 8,
    }] });
    await page.waitForTimeout(25);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test("all fourth-level report pages keep the reading anchor when zoom enters its pan viewport", async ({ page }) => {

  for (const path of reportPages) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);
    const stage = page.locator(".report-image-stage").first();
    const image = stage.getByRole("img");
    await expect(stage).toBeVisible();
    await expect(image).toBeVisible();
    const zoomIn = page.getByRole("button", { name: "放大报告图片" }).first();
    await zoomIn.scrollIntoViewIfNeeded();

    const before = await stage.evaluate((element) => ({
      height: element.clientHeight,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      ...(() => {
        const bounds = element.getBoundingClientRect();
        const anchorScreenY = (Math.max(0, bounds.top) + Math.min(innerHeight, bounds.bottom)) / 2;
        return { anchorScreenY, anchorContentY: element.scrollTop + anchorScreenY - bounds.top };
      })(),
    }));
    await zoomIn.click();
    await expect(image).toHaveAttribute("style", /width: 125%/);
    await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);

    const after = await stage.evaluate((element) => ({
      height: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      boundsTop: element.getBoundingClientRect().top,
      scrollTop: element.scrollTop,
      scale: Number(element.closest(".image-report")?.getAttribute("data-scale")),
    }));
    expect(before.height).toBeGreaterThan(after.height);
    expect(after.scrollWidth).toBeGreaterThan(after.clientWidth);
    expect(after.pageWidth).toBe(before.pageWidth);
    expect(after.pageWidth).toBe(before.viewportWidth);
    expect((after.scrollTop + before.anchorScreenY - after.boundsTop) / after.scale).toBeCloseTo(before.anchorContentY, 0);
  }
});

test("native report touch chains at vertical edges without triggering swipe-back or passive errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(reportPages[0]);
  const stage = page.locator(".report-image-stage").first();
  await expect(stage).toBeVisible();
  await expect(stage).toHaveClass(/is-loaded/);
  await expect(stage.getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: "放大报告图片" }).first().click();
  await expect(stage).toHaveAttribute("data-swipe-back-ignore", "true");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await stage.scrollIntoViewIfNeeded();
  await stage.evaluate((element) => {
    const browserWindow = window as typeof window & { __reportTouchMoveCount?: number };
    browserWindow.__reportTouchMoveCount = 0;
    element.addEventListener("touchmove", () => { browserWindow.__reportTouchMoveCount = (browserWindow.__reportTouchMoveCount ?? 0) + 1; }, { passive: true });
    element.scrollTop = element.scrollHeight;
  });
  await expect.poll(() => stage.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)).toBe(true);
  const verticalBox = await stage.boundingBox();
  if (!verticalBox) throw new Error("Zoomed report stage is not visible");
  const { pageScrollBefore, maximumPageScroll } = await page.evaluate(() => ({ pageScrollBefore: scrollY, maximumPageScroll: document.documentElement.scrollHeight - innerHeight }));
  expect(maximumPageScroll).toBeGreaterThan(pageScrollBefore);
  const verticalX = verticalBox.x + verticalBox.width / 2;
  const verticalStartY = Math.min(760, verticalBox.y + verticalBox.height * .72);
  await touchDrag(page, { x: verticalX, y: verticalStartY }, { x: verticalX, y: verticalStartY - 220 });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __reportTouchMoveCount?: number }).__reportTouchMoveCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(pageScrollBefore);

  await stage.scrollIntoViewIfNeeded();
  const horizontalBox = await stage.boundingBox();
  if (!horizontalBox) throw new Error("Zoomed report stage is not visible after vertical scroll chaining");
  const urlBeforePan = page.url();
  const horizontalY = Math.min(760, horizontalBox.y + horizontalBox.height / 2);
  await touchDrag(page, { x: horizontalBox.x + 40, y: horizontalY }, { x: Math.min(360, horizontalBox.x + 190), y: horizontalY });
  expect(page.url()).toBe(urlBeforePan);
  expect(consoleErrors.filter((message) => message.includes("passive event listener"))).toEqual([]);
});
