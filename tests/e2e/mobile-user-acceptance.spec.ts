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
  { name: "compact-tablet-landscape", width: 844, height: 390 },
  { name: "large-phone-landscape", width: 956, height: 440 },
] as const;

const evidenceRoot = "docs/audit-2026-08-18-mobile-user";

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
    const failedDesignResponses: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/design/") && response.status() >= 400) failedDesignResponses.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/go");
    await expect(page.getByRole("region", { name: "品牌引导页" })).toBeVisible();
    await expect(page.getByRole("button", { name: "进入档案" })).toBeVisible();
    const guideRoot = page.locator(".brand-guide");
    const guideStage = page.locator(".brand-guide-stage");
    const contentFrame = page.locator(".brand-guide-artwork");
    await expectStageFillsSafeContentBox(guideRoot, guideStage);
    await expect(guideStage).toHaveCSS("aspect-ratio", "auto");
    await expect(page.locator(".brand-guide-surround")).toHaveCount(0);
    const frameBox = await contentFrame.boundingBox();
    expect(frameBox).not.toBeNull();
    if (!frameBox) throw new Error("guide content frame has no layout box");
    expect(frameBox.width).toBeCloseTo(Math.min(device.width, 750), 0);
    expect(frameBox.x).toBeCloseTo((device.width - frameBox.width) / 2, 0);
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
        const style = window.getComputedStyle(element);
        return element.isConnected && style.objectFit === "cover" && style.objectPosition === "50% 50%";
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

    if (device.width <= device.height) {
      const portraitScene = page.locator(".brand-guide-portrait-scene");
      const edgeBleed = page.locator(".brand-guide-portrait-edge-bleed");
      const leftEdgeBleed = edgeBleed.locator(".brand-guide-portrait-edge-bleed-copy.is-left");
      const rightEdgeBleed = edgeBleed.locator(".brand-guide-portrait-edge-bleed-copy.is-right");
      await expect(portraitScene).toBeVisible();
      await expect(edgeBleed).toBeVisible();
      await expect(page.locator(".guide-landscape-composition")).toBeHidden();
      const [portraitBox, bleedBox, leftBleedBox, rightBleedBox] = await Promise.all([
        portraitScene.boundingBox(), edgeBleed.boundingBox(), leftEdgeBleed.boundingBox(), rightEdgeBleed.boundingBox(),
      ]);
      expect(portraitBox).not.toBeNull();
      expect(bleedBox).not.toBeNull();
      expect(leftBleedBox).not.toBeNull();
      expect(rightBleedBox).not.toBeNull();
      if (!portraitBox || !bleedBox || !leftBleedBox || !rightBleedBox) throw new Error("portrait coordinate stage or edge bleed has no layout box");
      const scale = Math.min(frameBox.width / 750, device.height / 1625);
      expect(portraitBox.width).toBeCloseTo(750 * scale, 0);
      expect(portraitBox.height).toBeCloseTo(1625 * scale, 0);
      expect(portraitBox.width / frameBox.width).toBeGreaterThanOrEqual(0.8);
      expect(portraitBox.height / device.height).toBeGreaterThanOrEqual(0.95);
      expect(bleedBox.x).toBeCloseTo(portraitBox.x, 1);
      expect(bleedBox.y).toBeCloseTo(portraitBox.y, 1);
      expect(bleedBox.width).toBeCloseTo(portraitBox.width, 1);
      expect(bleedBox.height).toBeCloseTo(portraitBox.height, 1);
      expect(leftBleedBox.x).toBeLessThanOrEqual(frameBox.x);
      expect(leftBleedBox.x + leftBleedBox.width).toBeGreaterThanOrEqual(portraitBox.x + 0.5);
      expect(rightBleedBox.x).toBeLessThanOrEqual(portraitBox.x + portraitBox.width - 0.5);
      expect(rightBleedBox.x + rightBleedBox.width).toBeGreaterThanOrEqual(frameBox.x + frameBox.width);
      expect(leftBleedBox.width / leftBleedBox.height).toBeCloseTo(6 / 13, 3);
      expect(rightBleedBox.width / rightBleedBox.height).toBeCloseTo(6 / 13, 3);
      await expect(leftEdgeBleed.locator("img")).toHaveCount(1);
      await expect(rightEdgeBleed.locator("img")).toHaveCount(1);
      await expect.poll(async () => leftEdgeBleed.evaluate((element) => {
        const style = getComputedStyle(element);
        const images = Array.from(element.querySelectorAll("img"));
        return images.every((image) => image.complete && image.naturalWidth === 750 && image.naturalHeight === 1625 && getComputedStyle(image).objectFit === "cover") && new DOMMatrixReadOnly(style.transform).a < 0;
      })).toBe(true);
      await expect.poll(async () => rightEdgeBleed.evaluate((element) => {
        const style = getComputedStyle(element);
        const images = Array.from(element.querySelectorAll("img"));
        return images.every((image) => image.complete && image.naturalWidth === 750 && image.naturalHeight === 1625 && getComputedStyle(image).objectFit === "cover") && new DOMMatrixReadOnly(style.transform).a < 0;
      })).toBe(true);
    } else {
      const composition = page.locator(".brand-guide-artwork > .guide-landscape-composition");
      await expect(composition).toBeVisible();
      await expect(page.locator(".brand-guide-portrait-scene")).toBeHidden();
      const landmarks = composition.locator("[data-guide-landmark]");
      await expect(landmarks).toHaveCount(4);
      await expect.poll(async () => landmarks.evaluateAll((elements) => elements.every((element) => {
        const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      })), { timeout: 15_000 }).toBe(true);
      const boxes = await landmarks.evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
        return {
          name: element.getAttribute("data-guide-landmark"),
          x: box.x,
          y: box.y,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          fit: image ? window.getComputedStyle(image).objectFit : style.objectFit,
          loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          visibleRatio: Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0)) * Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0)) / Math.max(1, box.width * box.height),
        };
      }));
      expect(boxes.every((box) => (box.name === "hint" || box.fit !== "contain") && box.loaded && box.visibleRatio >= 0.95)).toBe(true);
      const byName = Object.fromEntries(boxes.map((box) => [box.name, box]));
      expect(byName.logo.width / frameBox.width).toBeGreaterThanOrEqual(0.28);
      expect(byName.character.width / frameBox.width).toBeGreaterThanOrEqual(0.42);
      expect(byName.envelope.width / frameBox.width).toBeGreaterThanOrEqual(0.32);
      expect(byName.hint.width / frameBox.width).toBeGreaterThanOrEqual(0.2);
      const union = {
        left: Math.min(...boxes.map((box) => box.x)),
        top: Math.min(...boxes.map((box) => box.y)),
        right: Math.max(...boxes.map((box) => box.right)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
      };
      expect((union.right - union.left) / frameBox.width).toBeGreaterThanOrEqual(0.9);
      expect((union.bottom - union.top) / device.height).toBeGreaterThanOrEqual(0.82);
    }
    await expectNoHorizontalOverflow(page, device.width);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-guide.png` });

    const enter = page.getByRole("button", { name: "进入档案" });
    await expect(enter).toBeEnabled({ timeout: 7000 });
    await enter.click();
    await page.waitForURL(/\/reports$/);
    await expect(page.locator(".reports-archive-final")).toBeVisible();
    await expect(page.locator(".archive-category-hotspot")).toHaveCount(3);
    await expectNoHorizontalOverflow(page, device.width);
    await page.screenshot({ path: `${evidenceRoot}/${device.name}-${device.width}x${device.height}-archive.png` });
    expect(runtimeErrors).toEqual([]);
    expect(failedDesignResponses).toEqual([]);
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

  await page.screenshot({ path: "artifacts/design-qa/guide-progress-000-375x812.png" });
  // Start at the lower edge so the held gesture can cover the full transition.
  const startY = 811;
  await page.mouse.move(188, startY);
  await page.mouse.down();
  for (const progress of [0.25, 0.5, 0.75]) {
    await page.mouse.move(188, startY - 812 * progress, { steps: 8 });
    await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeCloseTo(progress, 1);
    const visualState = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>(".brand-guide-stage");
      const destination = document.querySelector<HTMLElement>(".brand-guide-destination-preview");
      if (!guide || !destination) return null;
      const guideBox = guide.getBoundingClientRect();
      const destinationBox = destination.getBoundingClientRect();
      return {
        guideOpacity: Number(getComputedStyle(guide).opacity),
        destinationOpacity: Number(getComputedStyle(destination).opacity),
        overlap: Math.max(0, Math.min(guideBox.bottom, destinationBox.bottom) - Math.max(guideBox.top, destinationBox.top)),
      };
    });
    expect(visualState).not.toBeNull();
    if (!visualState) throw new Error("guide transition panels are unavailable");
    expect(visualState.guideOpacity + visualState.destinationOpacity).toBeGreaterThanOrEqual(0.99);
    expect(visualState.overlap / 812).toBeGreaterThanOrEqual(0.73);
    await page.screenshot({ path: `artifacts/design-qa/guide-progress-${Math.round(progress * 100).toString().padStart(3, "0")}-375x812.png` });
  }

  await page.mouse.up();
  const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  await page.waitForURL(/\/reports$/);
  await expect(routeBuffer).toBeVisible();
  await expect(routeBuffer.locator(".h5-guide-route-destination-image")).toBeVisible();
  await expect.poll(async () => routeBuffer.locator(".h5-guide-route-destination-image").evaluate((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 1000;
  })).toBe(true);
  await expect(routeBuffer.locator(".h5-guide-route-destination-panel")).toHaveCSS("opacity", "1", { timeout: 2000 });
  await page.screenshot({ path: "artifacts/design-qa/guide-progress-100-375x812.png" });
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
    await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);
    await expect(page.locator(".category-card-hotspot")).not.toHaveCount(0);
    await expectNoHorizontalOverflow(page, 375);
    await page.screenshot({ path: `${evidenceRoot}/flow-${slug}-375x812.png` });
  }

  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "核心营养含量" })).toBeVisible();
  await expect(page.locator(".image-report")).not.toHaveCount(0);
  await expect(page.locator(".report-file-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /查看原 PDF|打开外部资料/ })).toHaveCount(0);
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

for (const viewport of [{ width: 320, height: 568 }, { width: 440, height: 820 }]) {
  test(`short portrait route snapshot softens its side edges at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: "进入档案" });
    await expect(enter).toBeEnabled({ timeout: 10000 });
    await enter.click({ noWaitAfter: true });
    const snapshot = page.locator("#h5-guide-route-buffer-host .h5-guide-route-portrait-snapshot");
    await expect(snapshot).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => snapshot.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.webkitMaskImage || style.maskImage;
    })).not.toBe("none");
    await page.screenshot({ path: `artifacts/portrait-route-snapshot-${viewport.width}x${viewport.height}.png` });
  });
}

test("guide keeps the complete source fallback when the destination preview cannot decode", async ({ page }) => {
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
  await expect(guideBuffer.locator(".h5-guide-route-guide-panel")).toHaveCSS("opacity", "1");
  await expect(guideBuffer.locator(".h5-guide-route-snapshot")).toBeVisible();
  await expect(guideBuffer.locator(".h5-guide-route-destination-panel")).toBeHidden();
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
