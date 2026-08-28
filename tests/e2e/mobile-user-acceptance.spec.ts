import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const devices = [
  { name: "iphone-se-first-generation", width: 320, height: 568 },
  { name: "compact-android", width: 360, height: 800 },
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-x-13-mini", width: 375, height: 812 },
  { name: "iphone-12-13-14", width: 390, height: 844 },
  { name: "embedded-browser-short", width: 393, height: 797 },
  { name: "iphone-14-15-pro", width: 393, height: 852 },
  { name: "iphone-plus-pro-max", width: 414, height: 896 },
  { name: "large-android-pro-max", width: 430, height: 932 },
  { name: "iphone-17-pro-max", width: 440, height: 956 },
  { name: "iphone-17-pro-max-embedded-short", width: 440, height: 820 },
  { name: "iphone-se-landscape", width: 667, height: 375 },
  { name: "iphone-12-landscape", width: 844, height: 390 },
  { name: "iphone-17-pro-max-landscape", width: 956, height: 440 },
] as const;

const evidenceRoot = "artifacts/p1-mobile-acceptance";

test.use({ browserName: "chromium" });

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  width: number,
) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.clientWidth).toBe(width);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(width);
}

async function expectStageFillsSafeContentBox(root: Locator, stage: Locator) {
  const [rootBox, stageBox, padding] = await Promise.all([
    root.boundingBox(),
    stage.boundingBox(),
    root.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        top: Number.parseFloat(style.paddingTop) || 0,
        right: Number.parseFloat(style.paddingRight) || 0,
        bottom: Number.parseFloat(style.paddingBottom) || 0,
        left: Number.parseFloat(style.paddingLeft) || 0,
      };
    }),
  ]);
  expect(rootBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  if (!rootBox || !stageBox) throw new Error("viewport stage has no layout box");
  expect(stageBox.x).toBeCloseTo(rootBox.x + padding.left, 0);
  expect(stageBox.y).toBeCloseTo(rootBox.y + padding.top, 0);
  expect(stageBox.width).toBeCloseTo(rootBox.width - padding.left - padding.right, 0);
  expect(stageBox.height).toBeCloseTo(rootBox.height - padding.top - padding.bottom, 0);
}

for (const device of devices) {
  test(`${device.name} completes guide to archive at ${device.width}x${device.height}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/go");
    await expect(page.getByRole("region", { name: "品牌引导页" })).toBeVisible();
    await expect(page.getByRole("button", { name: "进入档案" })).toBeVisible();
    const guideRoot = page.locator(".brand-guide");
    const guideStage = page.locator(".brand-guide-stage");
    await expectStageFillsSafeContentBox(guideRoot, guideStage);
    await expect(guideStage).toHaveCSS("aspect-ratio", "auto");
    await expect(page.locator(".brand-guide-surround")).toHaveCount(0);
    const fullCanvasLayers = page.locator([
      ".brand-guide-base",
      ".brand-guide-arch",
      ".brand-guide-paper",
      ".brand-guide-character",
      ".brand-guide-window-mask",
      ".brand-guide-foreground-top",
      ".brand-guide-fallback",
      ".brand-guide-bootstrap-reduced",
    ].join(", "));
    await expect.poll(async () => fullCanvasLayers.evaluateAll(
      (elements) => elements.length > 0 && elements.every((element) => {
        if (!(element instanceof HTMLImageElement) || !element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0) return false;
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const containScale = Math.min(box.width / element.naturalWidth, box.height / element.naturalHeight);
        const coverScale = Math.max(box.width / element.naturalWidth, box.height / element.naturalHeight);
        const scale = style.objectFit === "contain" ? containScale : coverScale;
        const visibleSourceWidth = Math.min(1, box.width / (element.naturalWidth * scale));
        const visibleSourceHeight = Math.min(1, box.height / (element.naturalHeight * scale));
        return element.isConnected && visibleSourceWidth >= .96 && visibleSourceHeight >= .96;
      }),
    )).toBe(true);
    await expect.poll(async () => fullCanvasLayers.evaluateAll((elements) => elements.length > 0 && elements.every((element) => {
      return element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0;
    }))).toBe(true);
    await expect(guideStage).toHaveAttribute("data-destination-state", "ready");
    const destinationImage = page.locator(".brand-guide-destination-image");
    await expect.poll(async () => destinationImage.evaluate((element) => {
      return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 1000 && element.naturalHeight === 5557;
    })).toBe(true);
    const entryHint = page.locator(".brand-guide-entry-hint");
    await expect(entryHint).toBeVisible();
    const [stageBox, hintBox, destinationBox] = await Promise.all([
      guideStage.boundingBox(),
      entryHint.boundingBox(),
      page.locator(".brand-guide-destination-preview").boundingBox(),
    ]);
    expect(stageBox).not.toBeNull();
    expect(hintBox).not.toBeNull();
    expect(destinationBox).not.toBeNull();
    if (!stageBox || !hintBox || !destinationBox) throw new Error("guide composition boxes are unavailable");
    expect(hintBox.x).toBeGreaterThanOrEqual(stageBox.x - 1);
    expect(hintBox.x + hintBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
    expect(hintBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(destinationBox.y + 1);
    const destinationFrameWidth = await page.locator(".brand-guide-destination-frame").evaluate((element) => element.getBoundingClientRect().width);
    expect(destinationFrameWidth).toBeCloseTo(Math.min(device.width, 750), 0);
    await expectNoHorizontalOverflow(page, device.width);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-guide.png` });

    const enter = page.getByRole("button", { name: "进入档案" });
    await expect(enter).toBeEnabled({ timeout: 7000 });
    await enter.click();
    const routeFrame = page.locator("#h5-guide-route-buffer-host .h5-guide-route-destination-frame");
    await expect(routeFrame).toHaveCount(1);
    await expect.poll(async () => routeFrame.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(destinationFrameWidth, 0);
    await expect.poll(async () => page.locator("#h5-guide-route-buffer-host .h5-guide-route-snapshot, #h5-guide-route-buffer-host .h5-guide-route-destination-image").evaluateAll(
      (images) => images.length === 2 && images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
    )).toBe(true);
    await page.waitForURL(/\/reports$/);
    const archive = page.locator(".reports-archive-final");
    await expect(archive).toBeVisible();
    await expect.poll(async () => archive.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(destinationFrameWidth, 0);
    await expect(page.locator(".archive-category-hotspot")).toHaveCount(3);
    await expectNoHorizontalOverflow(page, device.width);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-archive.png` });
    expect(runtimeErrors).toEqual([]);
  });
}

test("375x812 upward drag moves and crossfades the guide continuously before committing", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });

  const root = page.locator(".brand-guide");
  const stage = page.locator(".brand-guide-stage");
  await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 7000 });

  // Start inside the transparent bottom action so tap and swipe paths cannot
  // block each other on touch-first mobile browsers.
  await page.mouse.move(188, 770);
  await page.mouse.down();
  await page.mouse.move(188, 590, { steps: 6 });
  await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeGreaterThan(0.2);

  const dragState = await page.evaluate(() => {
    const rootElement = document.querySelector<HTMLElement>(".brand-guide");
    const trackElement = document.querySelector<HTMLElement>(".brand-guide-swipe-track");
    const artworkElement = document.querySelector<HTMLElement>(".brand-guide-artwork");
    const destinationElement = document.querySelector<HTMLElement>(".brand-guide-destination-image");
    const stageElement = document.querySelector<HTMLElement>(".brand-guide-stage");
    if (!rootElement || !trackElement || !artworkElement || !destinationElement || !stageElement) return null;
    const trackMatrix = new DOMMatrixReadOnly(getComputedStyle(trackElement).transform);
    return {
      progress: Number(rootElement.dataset.swipeProgress),
      offsetY: trackMatrix.m42,
      stageTop: stageElement.getBoundingClientRect().top,
      guideOpacity: Number(getComputedStyle(artworkElement).opacity),
      destinationOpacity: Number(getComputedStyle(destinationElement).opacity),
      guideFilter: getComputedStyle(artworkElement).filter,
      destinationFilter: getComputedStyle(destinationElement).filter,
    };
  });
  expect(dragState).not.toBeNull();
  if (!dragState) throw new Error("guide drag state is unavailable");
  expect(dragState.offsetY).toBeLessThan(-160);
  expect(dragState.guideOpacity).toBeLessThan(0.85);
  expect(dragState.destinationOpacity).toBeGreaterThan(0.3);
  expect(dragState.guideOpacity + dragState.destinationOpacity).toBeGreaterThanOrEqual(1.1);
  expect(dragState.guideFilter).toMatch(/^blur\(/);
  expect(dragState.destinationFilter).toMatch(/^blur\(/);
  await page.screenshot({ path: "artifacts/design-qa/guide-drag-progress-375x812.png" });

  await page.evaluate(() => {
    const heldWindow = window as typeof window & {
      __guideRafHold?: { original: typeof window.requestAnimationFrame; callbacks: FrameRequestCallback[] };
    };
    const original = window.requestAnimationFrame.bind(window);
    const callbacks: FrameRequestCallback[] = [];
    heldWindow.__guideRafHold = { original, callbacks };
    window.requestAnimationFrame = (callback) => {
      callbacks.push(callback);
      return 900000 + callbacks.length;
    };
  });
  await page.mouse.up();
  const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  await expect(routeBuffer).toBeVisible();
  await expect.poll(async () => routeBuffer.locator(".h5-guide-route-snapshot, .h5-guide-route-destination-image").evaluateAll(
    (images) => images.length === 2 && images.every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
  )).toBe(true);
  const continuityTop = await routeBuffer.locator(".h5-guide-route-snapshot").evaluate((snapshot) => snapshot.getBoundingClientRect().top);
  expect(Math.abs(continuityTop - dragState.stageTop)).toBeLessThanOrEqual(2);
  await page.evaluate(() => {
    const heldWindow = window as typeof window & {
      __guideRafHold?: { original: typeof window.requestAnimationFrame; callbacks: FrameRequestCallback[] };
    };
    const hold = heldWindow.__guideRafHold;
    if (!hold) return;
    window.requestAnimationFrame = hold.original;
    delete heldWindow.__guideRafHold;
    hold.callbacks.forEach((callback) => hold.original(callback));
  });
  await page.waitForURL(/\/reports$/);
  await expect(routeBuffer.locator(".h5-guide-route-destination-image")).toBeVisible();
  await expect.poll(async () => routeBuffer.locator(".h5-guide-route-destination-image").evaluate((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 1000;
  })).toBe(true);
  await page.screenshot({ path: "artifacts/design-qa/guide-drag-commit-375x812.png" });
  await expect(page.locator(".reports-archive-final")).toBeVisible({ timeout: 15000 });
  expect(runtimeErrors).toEqual([]);
});

test("375x812 user can open every category and a published report", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  for (const slug of ["inspection-projects", "review-assurance", "production-traceability"] as const) {
    await page.goto(`/reports/${slug}`);
    await expect(page.locator(".category-page-final")).toBeVisible();
    await expect(page.getByRole("button", { name: "返回上一页" })).toBeVisible();
    await expect(page.locator(".category-card-hotspot")).not.toHaveCount(0);
    await expectNoHorizontalOverflow(page, 375);
    await page.screenshot({ path: `${evidenceRoot}/flow-${slug}-375x812.png` });
  }

  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.getByRole("button", { name: "返回上一页" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "核心营养含量" })).toBeVisible();
  await expect(page.locator(".report-empty, .image-report")).not.toHaveCount(0);
  await expect(page.locator(".report-file-card")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 375);
  await page.screenshot({ path: `${evidenceRoot}/flow-published-report-375x812.png` });
  expect(runtimeErrors).toEqual([]);
});

test("guide handoff keeps the route loader behind the frozen guide until homepage artwork is painted", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/final-v1/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4200));
    await route.continue();
  });
  await page.goto("/go");
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(enter).toBeEnabled({ timeout: 8000 });
  await enter.click();
  await page.waitForURL(/\/reports$/);
  const guideBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  const runtimeLoadingLayer = page.locator(".runtime-loading-layer");
  await expect(guideBuffer).toBeVisible({ timeout: 3000 });
  await expect(guideBuffer.locator(".h5-guide-route-snapshot")).toHaveCount(1);
  await expect(guideBuffer.locator(".h5-guide-route-destination-image")).toHaveCount(1);
  await expect.poll(async () => guideBuffer.locator(".h5-guide-route-destination-image").evaluate((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 1000;
  })).toBe(true);
  await expect(guideBuffer.locator(".brand-guide-paper, .brand-guide-character")).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect(runtimeLoadingLayer).toHaveCount(0);
  await expect(page.locator(".guide-loading-buffer-poster, .guide-loading-buffer-gif")).toHaveCount(0);
  await expect(guideBuffer).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator(".reports-archive-final")).toBeVisible();
});

test("guide uses a textured transition fallback when the destination preview cannot decode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/final-v1/archive-reference.webp", (route) => route.abort());
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const stage = page.locator(".brand-guide-stage");
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(stage).toHaveAttribute("data-destination-state", "fallback", { timeout: 10000 });
  await expect(enter).toBeEnabled({ timeout: 10000 });
  await enter.click();
  const guideBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  await expect(guideBuffer).toHaveClass(/has-destination-fallback/);
  await expect(guideBuffer.locator(".h5-guide-route-destination-panel")).toHaveCSS("background-image", /archive-paper-texture\.webp/);
  await page.waitForURL(/\/reports$/);
  await expect(page.locator(".reports-archive-final")).toBeVisible({ timeout: 15000 });
});

test("375x812 guide handoff exposes staged timing and restores archive scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  let releaseHomepageAssets!: () => void;
  const homepageAssetsReleased = new Promise<void>((resolve) => {
    releaseHomepageAssets = resolve;
  });
  await page.route("**/design/final-v1/**", async (route) => {
    if (route.request().url().endsWith("/archive-reference.webp")) {
      await route.continue();
      return;
    }
    await homepageAssetsReleased;
    await route.continue();
  });

  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(enter).toBeEnabled({ timeout: 5000 });

  const root = page.locator("html");
  const guideBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  const runtimeLoadingLayer = page.locator(".runtime-loading-layer");
  const archive = page.locator(".reports-archive-final");
  const book = page.locator('[data-guide-entry-group="archive-book"]');
  const batch = page.locator('[data-guide-entry-group="latest-batch"]');

  await enter.click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(root).toHaveAttribute("data-guide-route-entry", "active");
  await expect(guideBuffer).toBeVisible();
  await page.waitForTimeout(300);
  await expect(runtimeLoadingLayer).toHaveCount(0);

  releaseHomepageAssets();
  await expect(root).toHaveAttribute("data-guide-route-entry", "revealing", { timeout: 10000 });
  await expect(guideBuffer).toHaveClass(/is-releasing/);
  await expect(runtimeLoadingLayer).toHaveCount(0);
  await expect(archive).toHaveAttribute("data-guide-entry", "reference-staged");

  const timing = await Promise.all([book, batch].map((group) => group.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const toMilliseconds = (value: string) => value.split(",").map((part) => {
      const time = part.trim();
      return time.endsWith("ms") ? Number.parseFloat(time) : Number.parseFloat(time) * 1000;
    });
    return {
      names: style.animationName.split(",").map((name) => name.trim()),
      durations: toMilliseconds(style.animationDuration),
      delays: toMilliseconds(style.animationDelay),
    };
  })));

  expect(timing[0].names).toEqual(["archive-guide-entry-rise", "archive-guide-entry-fade"]);
  expect(timing[0].durations).toEqual([520, 520]);
  expect(timing[0].delays).toEqual([0, 0]);
  expect(timing[1].names).toEqual(["archive-guide-entry-rise", "archive-guide-entry-fade"]);
  expect(timing[1].durations).toEqual([420, 420]);
  timing[1].delays.forEach((delay) => expect(delay).toBeCloseTo(374.4, 3));
  await page.screenshot({ path: "artifacts/design-qa/guide-to-archive-revealing-375x812.png" });

  await expect(root).not.toHaveAttribute("data-guide-route-entry", /.+/, { timeout: 5000 });
  await expect(guideBuffer).toHaveCount(0);
  await expect(archive).not.toHaveAttribute("data-guide-entry", /.+/);
  await expect(archive).not.toHaveAttribute("aria-busy", "true");
  await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  await expect(runtimeLoadingLayer).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/design-qa/archive-after-guide-375x812.png" });
});
