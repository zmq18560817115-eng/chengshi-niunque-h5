import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

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

const evidenceRoot = "test-results/mobile-user-acceptance";
type GuideProfile = "portrait-standard" | "portrait-compact" | "landscape";

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

function expectedGuideProfile(width: number, height: number): GuideProfile {
  if (width > height) return "landscape";
  return width / Math.max(1, height) >= 12 / 25 ? "portrait-compact" : "portrait-standard";
}

async function expectImagesDecodedWithoutStretch(images: Locator) {
  const metrics = await images.evaluateAll((elements) => elements.map((element) => {
    const image = element as HTMLImageElement;
    const style = window.getComputedStyle(image);
    // Use the resolved floating-point CSS box. offsetWidth/offsetHeight round
    // to integers and made the 440x820 compact hint look ~2.7% distorted even
    // though its declared width + auto height preserve the source ratio.
    const renderedWidth = Number.parseFloat(style.width);
    const renderedHeight = Number.parseFloat(style.height);
    return {
      className: image.className,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      naturalRatio: image.naturalWidth / Math.max(1, image.naturalHeight),
      renderedRatio: renderedWidth / Math.max(1, renderedHeight),
      renderedWidth,
      renderedHeight,
      objectFit: style.objectFit,
    };
  }));
  expect(metrics.length).toBeGreaterThan(0);
  for (const metric of metrics) {
    expect(metric.complete, metric.className).toBe(true);
    expect(metric.naturalWidth, metric.className).toBeGreaterThan(0);
    expect(metric.naturalHeight, metric.className).toBeGreaterThan(0);
    expect(metric.renderedWidth, metric.className).toBeGreaterThan(0);
    expect(metric.renderedHeight, metric.className).toBeGreaterThan(0);
    if (metric.objectFit === "fill") {
      expect(Math.abs(metric.naturalRatio - metric.renderedRatio), metric.className).toBeLessThan(.025);
    }
  }
}

const portraitCanvasLayerSelector = [
  ".brand-guide-window-mask",
  ".brand-guide-arch",
  ".brand-guide-paper",
  ".brand-guide-character",
  ".brand-guide-foreground-top",
].join(", ");

async function expectSharedPortraitScene(
  page: Page,
  frame: { x: number; y: number; width: number; height: number },
) {
  const scene = page.locator(".brand-guide-portrait-scene");
  const liveStage = scene.locator(".brand-guide-live-stage");
  const canvasLayers = liveStage.locator(portraitCanvasLayerSelector);
  const hint = page.locator(".brand-guide-entry-hint");

  await expect(scene).toBeVisible();
  await expect(scene).not.toHaveClass(/is-compact-fallback/);
  await expect(liveStage).toBeVisible();
  await expect(hint).toBeVisible();
  await expect(page.locator(".guide-compact-portrait-composition, .guide-landscape-composition")).toHaveCount(0);
  await expect(canvasLayers).toHaveCount(9);

  const [sceneBox, hintBox] = await Promise.all([
    scene.boundingBox(),
    hint.boundingBox(),
  ]);
  expect(sceneBox).not.toBeNull();
  expect(hintBox).not.toBeNull();
  if (!sceneBox || !hintBox) throw new Error("portrait coordinate stage has no layout box");
  expect(sceneBox.width / sceneBox.height).toBeCloseTo(6 / 13, 3);
  expect(sceneBox.x + sceneBox.width / 2).toBeCloseTo(frame.x + frame.width / 2, 0);
  expect(sceneBox.y + sceneBox.height / 2).toBeCloseTo(frame.y + frame.height / 2, 0);
  expect(sceneBox.width).toBeCloseTo(frame.width, 0);
  expect(sceneBox.height).toBeCloseTo(frame.width * 13 / 6, 0);
  expect(hintBox.x + hintBox.width / 2).toBeCloseTo(frame.x + frame.width / 2, 0);
  expect(hintBox.y).toBeGreaterThanOrEqual(frame.y - 1);
  expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(frame.y + frame.height + 1);

  await expect.poll(async () => canvasLayers.evaluateAll((elements, expectedScene) => elements.every((element) => {
    if (!(element instanceof HTMLImageElement)) return false;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return element.complete
      && element.naturalWidth === 750
      && element.naturalHeight === 1625
      && Math.abs(box.left - expectedScene.x) <= 1
      && Math.abs(box.top - expectedScene.y) <= 1
      && Math.abs(box.width - expectedScene.width) <= 1
      && Math.abs(box.height - expectedScene.height) <= 1
      && style.objectFit === "fill"
      && style.objectPosition === "50% 50%";
  }), sceneBox)).toBe(true);
  await expectImagesDecodedWithoutStretch(liveStage.locator("img"));
  return sceneBox;
}

async function expectLandmarkCoverage(
  landmarks: Locator,
  frame: { x: number; y: number; width: number; height: number },
  minimumWidthRatio: number,
  minimumHeightRatio: number,
) {
  const boxes = await landmarks.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
    };
  }));
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    const visibleWidth = Math.max(0, Math.min(box.right, frame.x + frame.width) - Math.max(box.left, frame.x));
    const visibleHeight = Math.max(0, Math.min(box.bottom, frame.y + frame.height) - Math.max(box.top, frame.y));
    expect(visibleWidth * visibleHeight / Math.max(1, box.width * box.height)).toBeGreaterThanOrEqual(.94);
  }
  const union = {
    left: Math.min(...boxes.map((box) => box.left)),
    top: Math.min(...boxes.map((box) => box.top)),
    right: Math.max(...boxes.map((box) => box.right)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
  };
  expect((union.right - union.left) / frame.width).toBeGreaterThanOrEqual(minimumWidthRatio);
  expect((union.bottom - union.top) / frame.height).toBeGreaterThanOrEqual(minimumHeightRatio);
}

async function expectPrimedGuideBuffer(page: Page, profile: GuideProfile) {
  const buffer = page.locator(`#h5-guide-route-buffer-host > .h5-guide-route-buffer[data-guide-profile="${profile}"]`);
  await expect(buffer).toHaveClass(/is-preparing/, { timeout: 15_000 });
  await expect(buffer).toBeHidden();
  const images = buffer.locator("img");
  await expect.poll(async () => images.evaluateAll((elements) => elements.length > 0 && elements.every((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
  })), { timeout: 15_000 }).toBe(true);
  await expectImagesDecodedWithoutStretch(images);
  return buffer;
}

async function expectLayeredGuideDestination(root: Locator) {
  const book = root.locator('[data-guide-destination-group="archive-book"]');
  const batch = root.locator('[data-guide-destination-group="latest-batch"]');
  await expect(book).toHaveCount(1);
  await expect(batch).toHaveCount(1);
  await expect(book.locator('[data-source-part]')).toHaveCount(5);
  await expect(batch.locator('[data-source-part]')).toHaveCount(4);
  await expect(root.locator('img[src*="archive-transition-preview.webp"]')).toHaveCount(0);
  await expectImagesDecodedWithoutStretch(root.locator('[data-guide-destination-group] img'));
  return { book, batch };
}

type GuideEntryTimelineSample = {
  at: number;
  routeState: string | null;
  commitState: string | null;
  bufferConnected: boolean;
  bufferReleasing: boolean;
  routeBookOpacity: number | null;
  routeBatchOpacity: number | null;
  liveBookOpacity: number | null;
  liveBatchOpacity: number | null;
  bookOpacity: number | null;
  batchOpacity: number | null;
  fallbackVisible: boolean;
  ribbons: Array<{ state: string | null; progress: number; clip: string; images: number }>;
};

async function startGuideEntryTimelineProbe(page: Page) {
  await page.evaluate(() => {
    const timelineWindow = window as typeof window & {
      __guideEntryTimelineProbe?: { running: boolean; samples: GuideEntryTimelineSample[] };
    };
    const effectiveOpacity = (element: Element | null) => {
      if (!element) return 0;
      let opacity = 1;
      let current: Element | null = element;
      while (current) {
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") return 0;
        opacity *= Number.parseFloat(style.opacity || "1");
        current = current.parentElement;
      }
      return opacity;
    };
    const probe = { running: true, samples: [] as GuideEntryTimelineSample[] };
    timelineWindow.__guideEntryTimelineProbe = probe;
    const sample = () => {
      if (!probe.running) return;
      const buffer = document.querySelector<HTMLElement>("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
      const routeBook = buffer?.querySelector<HTMLElement>('[data-guide-destination-group="archive-book"]') ?? null;
      const routeBatch = buffer?.querySelector<HTMLElement>('[data-guide-destination-group="latest-batch"]') ?? null;
      const liveBook = document.querySelector<HTMLElement>('[data-guide-entry-group="archive-book"]');
      const liveBatch = document.querySelector<HTMLElement>('[data-guide-entry-group="latest-batch"]');
      const bufferReleasing = buffer?.classList.contains("is-releasing") ?? false;
      const fallback = document.querySelector<HTMLElement>(".reports-archive-reference-fallback");
      const routeBookOpacity = routeBook ? effectiveOpacity(routeBook) : null;
      const routeBatchOpacity = routeBatch ? effectiveOpacity(routeBatch) : null;
      const liveBookOpacity = liveBook ? effectiveOpacity(liveBook) : null;
      const liveBatchOpacity = liveBatch ? effectiveOpacity(liveBatch) : null;
      const visibleOpacity = (routeOpacity: number | null, liveOpacity: number | null) => {
        if (!buffer) return liveOpacity;
        if (!bufferReleasing) return routeOpacity;
        if (routeOpacity === null) return liveOpacity;
        if (liveOpacity === null) return routeOpacity;
        return 1 - (1 - routeOpacity) * (1 - liveOpacity);
      };
      const ribbons = [...document.querySelectorAll<HTMLElement>(
        ".brand-guide-destination-content .h5-guide-archive-entry-ribbon-clip, #h5-guide-route-buffer-host > .h5-guide-route-buffer .h5-guide-archive-entry-ribbon-clip, .archive-unlock-tab-motion",
      )].map((ribbon) => {
        const live = ribbon.classList.contains("archive-unlock-tab-motion");
        const clip = live ? ribbon.querySelector<HTMLElement>(".archive-unlock-tab-clip") : ribbon;
        return {
          state: ribbon.dataset.unlockState ?? ribbon.dataset.guideDestinationRibbon ?? null,
          progress: Number.parseFloat(ribbon.dataset.unlockProgress || "0"),
          clip: clip ? getComputedStyle(clip).clipPath : "none",
          images: ribbon.querySelectorAll(live ? ".archive-unlock-tab-image" : ".h5-guide-archive-entry-ribbon").length,
        };
      });
      probe.samples.push({
        at: performance.now(),
        routeState: document.documentElement.getAttribute("data-guide-route-entry"),
        commitState: buffer?.dataset.commitState ?? null,
        bufferConnected: Boolean(buffer),
        bufferReleasing,
        routeBookOpacity,
        routeBatchOpacity,
        liveBookOpacity,
        liveBatchOpacity,
        bookOpacity: visibleOpacity(routeBookOpacity, liveBookOpacity),
        batchOpacity: visibleOpacity(routeBatchOpacity, liveBatchOpacity),
        fallbackVisible: effectiveOpacity(fallback) > .01,
        ribbons,
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopGuideEntryTimelineProbe(page: Page) {
  return page.evaluate(() => {
    const timelineWindow = window as typeof window & {
      __guideEntryTimelineProbe?: { running: boolean; samples: GuideEntryTimelineSample[] };
    };
    const probe = timelineWindow.__guideEntryTimelineProbe;
    if (!probe) return [];
    probe.running = false;
    return probe.samples;
  });
}

const isPartialRibbonClip = (clip: string) => clip !== "none"
  && !/^inset\((?:0(?:px|%)?(?:\s+|$)){1,4}\)$/i.test(clip);

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
    const profile = expectedGuideProfile(device.width, device.height);
    await expect(guideRoot).toHaveAttribute("data-guide-profile", profile, { timeout: 15_000 });
    await expect(guideStage).toHaveAttribute("data-load-state", "ready", { timeout: 15_000 });
    await expect(guideStage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15_000 });
    await expectStageFillsSafeContentBox(guideRoot, guideStage);
    await expect(guideStage).toHaveCSS("aspect-ratio", "auto");
    await expect(page.locator(".brand-guide-surround")).toHaveCount(0);
    await expect(page.locator(".brand-guide-window-mask")).toHaveCount(profile === "landscape" ? 0 : 1);
    await expect(page.locator(".brand-guide .motion-stage")).toHaveCount(0);
    await expect(page.locator(".runtime-loading-layer")).toHaveCount(0);
    const frameBox = await contentFrame.boundingBox();
    expect(frameBox).not.toBeNull();
    if (!frameBox) throw new Error("guide content frame has no layout box");
    expect(frameBox.width).toBeCloseTo(Math.min(device.width, 750), 0);
    expect(frameBox.x).toBeCloseTo((device.width - frameBox.width) / 2, 0);
    await expect(guideStage).toHaveAttribute("data-destination-state", "ready");
    await expectLayeredGuideDestination(page.locator(".brand-guide-destination-content"));

    if (profile === "portrait-standard" || profile === "portrait-compact") {
      await expect(page.locator(".brand-guide-portrait-edge-bleed")).toHaveCount(0);
      await expectSharedPortraitScene(page, frameBox);
    } else {
      const composition = page.locator(".brand-guide-artwork > .guide-landscape-composition");
      await expect(composition).toBeVisible();
      await expect(page.locator(".brand-guide-portrait-scene, .guide-compact-portrait-composition")).toHaveCount(0);
      const landmarks = composition.locator("[data-guide-landmark]");
      await expect(landmarks).toHaveCount(4);
      await expectLandmarkCoverage(landmarks, frameBox, .9, .78);
      await expectImagesDecodedWithoutStretch(composition.locator("img"));
    }
    await expectPrimedGuideBuffer(page, profile);
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
  await expectLayeredGuideDestination(routeBuffer.locator(".h5-guide-route-destination-content"));
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
    await expect(page.locator(".swipe-back-control")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /返回/ })).toHaveCount(0);
    await expect(page.locator(".category-card-hotspot")).not.toHaveCount(0);
    await expectNoHorizontalOverflow(page, 375);
    await page.screenshot({ path: `${evidenceRoot}/flow-${slug}-375x812.png` });
  }

  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.locator(".swipe-back-control")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /返回/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "核心营养含量" })).toBeVisible();
  await expect(page.locator(".report-empty, .image-report")).not.toHaveCount(0);
  await expect(page.locator(".report-file-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /查看原 PDF|打开外部资料/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 375);
  await page.screenshot({ path: `${evidenceRoot}/flow-published-report-375x812.png` });
  expect(runtimeErrors).toEqual([]);
});

test("guide handoff reuses the predecoded route buffer until homepage artwork is painted", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/final-v1/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4200));
    await route.continue();
  });
  await page.goto("/go");
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(enter).toBeEnabled({ timeout: 8000 });
  const primedBuffer = await expectPrimedGuideBuffer(page, "portrait-standard");
  await primedBuffer.evaluate((element) => { element.setAttribute("data-test-prime-id", "mobile-acceptance"); });
  await enter.click();
  await page.waitForURL(/\/reports$/);
  const guideBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  const runtimeLoadingLayer = page.locator(".runtime-loading-layer");
  await expect(guideBuffer).toBeVisible({ timeout: 3000 });
  await expect(guideBuffer.locator(".h5-guide-route-snapshot")).toHaveCount(1);
  await expectLayeredGuideDestination(guideBuffer.locator(".h5-guide-route-destination-content"));
  await expect(guideBuffer).toHaveAttribute("data-test-prime-id", "mobile-acceptance");
  await expect(guideBuffer).toHaveAttribute("data-guide-profile", "portrait-standard");
  await expect(guideBuffer.locator(".brand-guide-paper, .brand-guide-character")).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect(runtimeLoadingLayer).toHaveCount(0);
  await expect(page.locator(".guide-loading-buffer-poster, .guide-loading-buffer-gif")).toHaveCount(0);
  await expect(guideBuffer).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator(".reports-archive-final")).toBeVisible();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 440, height: 820 }]) {
  test(`short portrait route snapshot keeps the shared 6:13 canvas at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-guide")).toHaveAttribute("data-guide-profile", "portrait-compact");
    const enter = page.getByRole("button", { name: "进入档案" });
    await expect(enter).toBeEnabled({ timeout: 10000 });
    const buffer = await expectPrimedGuideBuffer(page, "portrait-compact");
    const snapshot = page.locator("#h5-guide-route-buffer-host .h5-guide-route-snapshot");
    const snapshotImage = snapshot.locator(".h5-guide-route-portrait-snapshot");
    await expect(snapshotImage).toHaveCount(1);
    await expect(snapshot.locator(".guide-compact-portrait-composition")).toHaveCount(0);

    // Measure the decoded prime before commit. Both portrait profiles reuse
    // the exact 750x1625 reference plane at the full viewport width. The
    // centered 6:13 plane may be vertically clipped on short viewports, but
    // the handoff cannot jump to a differently scaled composition.
    const snapshotBox = await snapshot.boundingBox();
    expect(snapshotBox).not.toBeNull();
    if (!snapshotBox) throw new Error("portrait route snapshot has no layout box");
    expect(snapshotBox.width / snapshotBox.height).toBeCloseTo(6 / 13, 3);
    expect(snapshotBox.x + snapshotBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(snapshotBox.y + snapshotBox.height / 2).toBeCloseTo(viewport.height / 2, 0);
    expect(snapshotBox.width).toBeCloseTo(viewport.width, 0);
    expect(snapshotBox.height).toBeCloseTo(viewport.width * 13 / 6, 0);
    await expect.poll(async () => snapshotImage.evaluate((element) => element instanceof HTMLImageElement
      && element.complete
      && element.naturalWidth === 750
      && element.naturalHeight === 1625
      && getComputedStyle(element).objectFit === "fill")).toBe(true);
    await expectImagesDecodedWithoutStretch(snapshotImage);

    // Reveal the already primed tree and seek the real CSS transitions. Both
    // full-viewport panels must overlap at every acceptance frame; the shared
    // portrait snapshot remains painted while the destination takes over.
    await buffer.evaluate((element) => {
      element.classList.remove("is-preparing");
      void element.getBoundingClientRect();
      element.classList.add("is-committing");
    });
    await expect(snapshot).toBeVisible();
    for (const progress of [0, .25, .5, .75, 1]) {
      const metrics = await buffer.evaluate((element, value) => {
        const guidePanel = element.querySelector<HTMLElement>(".h5-guide-route-guide-panel")!;
        const destinationPanel = element.querySelector<HTMLElement>(".h5-guide-route-destination-panel")!;
        const portraitSnapshot = element.querySelector<HTMLElement>(".h5-guide-route-portrait-snapshot")!;
        const seek = (panel: HTMLElement) => {
          for (const animation of panel.getAnimations()) {
            animation.pause();
            const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
            animation.currentTime = duration * value;
          }
        };
        seek(guidePanel);
        seek(destinationPanel);
        const guideBox = guidePanel.getBoundingClientRect();
        const destinationBox = destinationPanel.getBoundingClientRect();
        const visibleRatio = (target: HTMLElement) => {
          const box = target.getBoundingClientRect();
          const visibleWidth = Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0));
          const visibleHeight = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0));
          return visibleWidth * visibleHeight / Math.max(1, box.width * box.height);
        };
        const destination = destinationPanel.querySelector("img") as HTMLImageElement | null;
        return {
          guideOpacity: Number(getComputedStyle(guidePanel).opacity),
          destinationOpacity: Number(getComputedStyle(destinationPanel).opacity),
          overlap: Math.max(0, Math.min(guideBox.bottom, destinationBox.bottom) - Math.max(guideBox.top, destinationBox.top)),
          snapshotVisibleRatio: visibleRatio(portraitSnapshot),
          destinationDecoded: Boolean(destination?.complete && destination.naturalWidth > 0),
        };
      }, progress);
      expect(metrics.guideOpacity + metrics.destinationOpacity).toBeGreaterThanOrEqual(.99);
      expect(metrics.overlap / viewport.height).toBeGreaterThanOrEqual(.73);
      expect(metrics.snapshotVisibleRatio).toBeGreaterThanOrEqual(.7);
      expect(metrics.destinationDecoded).toBe(true);
      await page.screenshot({ path: `artifacts/portrait-route-snapshot-${viewport.width}x${viewport.height}-${Math.round(progress * 100).toString().padStart(3, "0")}.png` });
    }
    await expectNoHorizontalOverflow(page, viewport.width);
  });
}

for (const viewport of [{ width: 408, height: 740 }, { width: 408, height: 805 }]) {
  test(`real-device compact portrait uses the shared reference canvas at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    const root = page.locator(".brand-guide");
    const stage = page.locator(".brand-guide-stage");
    await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
    await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 10000 });
    const frameBox = await page.locator(".brand-guide-artwork").boundingBox();
    expect(frameBox).not.toBeNull();
    if (!frameBox) throw new Error("compact guide frame has no layout box");
    await expectSharedPortraitScene(page, frameBox);
    await expect(page.locator(".brand-guide-portrait-edge-bleed")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, viewport.width);
  });
}

test("mobile browser toolbar height change keeps the selected compact profile and shared 6:13 plane", async ({ page }) => {
  await page.setViewportSize({ width: 408, height: 740 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const root = page.locator(".brand-guide");
  const stage = page.locator(".brand-guide-stage");
  await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
  await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 10000 });
  const scene = page.locator(".brand-guide-portrait-scene");
  const before = await scene.boundingBox();
  expect(before).not.toBeNull();

  await page.setViewportSize({ width: 408, height: 805 });
  await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
  const after = await scene.boundingBox();
  expect(after).not.toBeNull();
  expect((before?.width ?? 0) / Math.max(1, before?.height ?? 1)).toBeCloseTo(6 / 13, 3);
  expect((after?.width ?? 0) / Math.max(1, after?.height ?? 1)).toBeCloseTo(6 / 13, 3);
  expect(after?.width).toBeCloseTo(before?.width ?? 0, 0);
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 0);
  expect(before?.width).toBeCloseTo(408, 0);
  expect(after?.width).toBeCloseTo(408, 0);
  await expect(page.locator(".brand-guide-entry-hint")).toBeVisible();
  await expectImagesDecodedWithoutStretch(scene.locator(".brand-guide-live-stage img"));
  await expect(page.locator(".guide-compact-portrait-composition, .brand-guide-portrait-scene.is-compact-fallback")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 408);
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 393, height: 852 },
  { width: 408, height: 740 },
  { width: 440, height: 820 },
]) {
  test(`portrait visual contract stays aligned without stretching at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    const profile = expectedGuideProfile(viewport.width, viewport.height);
    await expect(page.locator(".brand-guide")).toHaveAttribute("data-guide-profile", profile);
    const stage = page.locator(".brand-guide-stage");
    await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 10000 });
    const frameBox = await page.locator(".brand-guide-artwork").boundingBox();
    expect(frameBox).not.toBeNull();
    if (!frameBox) throw new Error("portrait visual-contract frame has no layout box");
    await expectSharedPortraitScene(page, frameBox);
    await expectNoHorizontalOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/design-qa/guide-visual-contract-${viewport.width}x${viewport.height}.png`, animations: "disabled" });
  });
}

test("cold-cache standard guide keeps the complete fallback until every live layer decodes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const delayedNames = new Set([
    "guide-window-mask.webp",
    "guide-arch.webp", "guide-character-open.webp", "guide-character-closed.webp", "guide-foreground-top.webp",
    "report-paper-top.webp", "report-paper-left.webp", "report-paper-right.webp", "report-paper-bottom.webp",
    "swipe-up-hint-v2.png",
  ]);
  await page.route("**/design/guide/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    if (delayedNames.has(name)) await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const root = page.locator(".brand-guide");
  const stage = page.locator(".brand-guide-stage");
  const fallback = page.locator(".brand-guide-portrait-scene .brand-guide-fallback");
  const liveStage = page.locator(".brand-guide-live-stage");
  await expect(root).toHaveAttribute("data-guide-profile", "portrait-standard");
  await expect(stage).toHaveAttribute("data-load-state", "loading");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveCSS("opacity", "1");
  await expect(liveStage).toHaveCSS("opacity", "0");
  await expect(page.locator(".brand-guide .motion-stage, .runtime-loading-layer")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/design-qa/guide-cold-cache-fallback-375x812.png" });
  await expect(stage).toHaveAttribute("data-load-state", "ready", { timeout: 15000 });
  await expect(liveStage).toHaveCSS("opacity", "1");
  await expect(fallback).toHaveCSS("opacity", "0");
  await expectImagesDecodedWithoutStretch(liveStage.locator("img"));
});

test("guide keeps the complete source fallback when the destination preview cannot decode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/final-v1/archive/runtime-layers/module-1-passed-copy.runtime.webp", (route) => route.abort());
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

  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const enter = page.getByRole("button", { name: "进入档案" });
  await expect(enter).toBeEnabled({ timeout: 5000 });

  const root = page.locator("html");
  const guideBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  const runtimeLoadingLayer = page.locator(".runtime-loading-layer");
  const archive = page.locator(".reports-archive-final");
  const fallback = page.locator(".reports-archive-reference-fallback");
  const ribbon = page.locator(".archive-unlock-tab-motion");

  await startGuideEntryTimelineProbe(page);
  await enter.click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(root).toHaveAttribute("data-guide-route-entry", "active");
  await expect(guideBuffer).toBeVisible();
  await expect(guideBuffer).toHaveClass(/is-committing/);
  await expect(runtimeLoadingLayer).toHaveCount(0);

  const routeBatch = guideBuffer.locator('[data-guide-destination-group="latest-batch"]');
  const routeTiming = await routeBatch.evaluate((element) => {
    const style = getComputedStyle(element);
    const panel = element.closest(".h5-guide-route-buffer")?.querySelector<HTMLElement>(".h5-guide-route-panel");
    const toMilliseconds = (value: string) => value.split(",").map((part) => {
      const time = part.trim();
      return time.endsWith("ms") ? Number.parseFloat(time) : Number.parseFloat(time) * 1000;
    });
    return {
      panelDurations: panel ? toMilliseconds(getComputedStyle(panel).transitionDuration) : [],
      durations: toMilliseconds(style.transitionDuration),
      delays: toMilliseconds(style.transitionDelay),
    };
  });
  expect(routeTiming.panelDurations).toEqual([630, 630]);
  expect(routeTiming.durations).toEqual([504, 504]);
  routeTiming.delays.forEach((delay) => expect(delay).toBeCloseTo(504, 3));

  await expect(root).toHaveAttribute("data-guide-route-entry", "revealing", { timeout: 10000 });
  await expect(guideBuffer).toHaveClass(/is-releasing/);
  await expect(runtimeLoadingLayer).toHaveCount(0);
  await expect(archive).toHaveAttribute("data-guide-entry", "reference-staged");
  await expect(fallback).toBeHidden();
  await expect(ribbon).toHaveCount(1);
  await expect(ribbon.locator(".archive-unlock-tab-image")).toHaveCount(1);
  await expect(ribbon).toHaveAttribute("data-unlock-state", "idle");
  await expect(ribbon).toHaveAttribute("data-unlock-progress", "0.000");
  await page.screenshot({ path: "artifacts/design-qa/guide-to-archive-revealing-375x812.png" });

  await expect(root).not.toHaveAttribute("data-guide-route-entry", /.+/, { timeout: 5000 });
  await expect(guideBuffer).toHaveCount(0);
  // Keep a terminal marker after the route buffer leaves so deferred archive
  // artwork cannot replay the staged entry animation as it mounts.
  await expect(archive).toHaveAttribute("data-guide-entry", "complete");
  await expect(archive).not.toHaveAttribute("aria-busy", "true");
  await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  await expect(runtimeLoadingLayer).toHaveCount(0);

  const entrySamples = await stopGuideEntryTimelineProbe(page);
  const stagedSamples = entrySamples.filter((sample) => sample.bookOpacity !== null && sample.batchOpacity !== null);
  expect(stagedSamples.length).toBeGreaterThan(8);
  const firstBookVisible = stagedSamples.findIndex((sample) => (sample.bookOpacity ?? 0) > .03);
  const firstBatchVisible = stagedSamples.findIndex((sample) => (sample.batchOpacity ?? 0) > .03);
  expect(firstBookVisible).toBeGreaterThanOrEqual(0);
  expect(firstBatchVisible).toBeGreaterThan(firstBookVisible);
  expect(stagedSamples.slice(0, firstBatchVisible).every((sample) => (sample.batchOpacity ?? 0) <= .03)).toBe(true);
  const commitStart = stagedSamples.find((sample) => sample.commitState === "committing");
  expect(commitStart).toBeDefined();
  expect(stagedSamples[firstBatchVisible].at - (commitStart?.at ?? stagedSamples[firstBatchVisible].at)).toBeGreaterThanOrEqual(470);
  for (let index = firstBookVisible + 1; index < stagedSamples.length; index += 1) {
    expect(stagedSamples[index].bookOpacity ?? 0).toBeGreaterThanOrEqual((stagedSamples[index - 1].bookOpacity ?? 0) - .04);
  }
  for (let index = firstBatchVisible + 1; index < stagedSamples.length; index += 1) {
    expect(stagedSamples[index].batchOpacity ?? 0).toBeGreaterThanOrEqual((stagedSamples[index - 1].batchOpacity ?? 0) - .04);
  }
  expect(entrySamples.filter((sample) => sample.routeState && sample.fallbackVisible)).toEqual([]);
  expect(entrySamples.flatMap((sample) => sample.ribbons).length).toBeGreaterThan(8);
  expect(entrySamples.flatMap((sample) => sample.ribbons).every((sample) => sample.images === 1
    && sample.state === "idle"
    && sample.progress === 0
    && isPartialRibbonClip(sample.clip))).toBe(true);
  const firstRelease = stagedSamples.findIndex((sample) => sample.bufferReleasing);
  expect(firstRelease).toBeGreaterThan(0);
  // Once `is-releasing` is sampled, effectiveOpacity also includes the
  // already-fading parent buffer. Check the last pre-release frame instead.
  expect(stagedSamples[firstRelease - 1].routeBatchOpacity ?? 0, "route buffer cannot release before latest-batch settles").toBeGreaterThanOrEqual(.97);

  const scrollMetrics = await page.evaluate(() => ({ height: document.scrollingElement?.scrollHeight ?? 0, viewport: window.innerHeight }));
  expect(scrollMetrics.height).toBeGreaterThan(scrollMetrics.viewport);
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 240 }));
    window.scrollTo(0, 240);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect.poll(async () => Number(await ribbon.getAttribute("data-unlock-progress"))).toBeGreaterThan(0);
  await expect(ribbon).toHaveAttribute("data-unlock-state", /^(revealing|revealed)$/);
  const firstRevealProgress = Number(await ribbon.getAttribute("data-unlock-progress"));
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 240 }));
    window.scrollTo(0, 480);
  });
  await expect.poll(async () => Number(await ribbon.getAttribute("data-unlock-progress"))).toBeGreaterThanOrEqual(firstRevealProgress);
  await expect(ribbon).toHaveAttribute("data-unlock-state", "revealed");
  await expect(ribbon).toHaveAttribute("data-unlock-progress", "1.000");
  await page.screenshot({ path: "artifacts/design-qa/archive-after-guide-375x812.png" });
});
