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
    await expect(page.locator(".brand-guide-window-mask")).toHaveCount(0);
    await expect(page.locator(".brand-guide .motion-stage")).toHaveCount(0);
    await expect(page.locator(".runtime-loading-layer")).toHaveCount(0);
    const frameBox = await contentFrame.boundingBox();
    expect(frameBox).not.toBeNull();
    if (!frameBox) throw new Error("guide content frame has no layout box");
    expect(frameBox.width).toBeCloseTo(Math.min(device.width, 750), 0);
    expect(frameBox.x).toBeCloseTo((device.width - frameBox.width) / 2, 0);
    const fullCanvasLayers = page.locator([
      ".brand-guide-arch",
      ".brand-guide-paper",
      ".brand-guide-character",
      ".brand-guide-foreground-top",
      ".brand-guide-fallback",
    ].join(", "));
    // Only the 750x1625 portrait-standard canvas is intentionally stretched
    // to the responsive 6:13 scene. Compact and landscape use cropped,
    // aspect-preserving component layers, so requiring object-fit: fill there
    // would reject the current responsive-touch-v3 composition.
    if (profile === "portrait-standard") {
      await expect.poll(async () => fullCanvasLayers.evaluateAll(
        (elements) => elements.length > 0 && elements.every((element) => {
          const style = window.getComputedStyle(element);
          return element.isConnected && style.objectFit === "fill" && style.objectPosition === "50% 50%";
        }),
      )).toBe(true);
    }
    await expect(guideStage).toHaveAttribute("data-destination-state", "ready");
    const destinationImage = page.locator(".brand-guide-destination-image");
    await expect.poll(async () => destinationImage.evaluate((element) => {
      return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 750 && element.naturalHeight === 1625;
    })).toBe(true);
    await expectImagesDecodedWithoutStretch(destinationImage);

    if (profile === "portrait-standard") {
      const portraitScene = page.locator(".brand-guide-portrait-scene");
      await expect(portraitScene).toBeVisible();
      await expect(portraitScene).not.toHaveClass(/is-compact-fallback/);
      await expect(page.locator(".guide-compact-portrait-composition, .guide-landscape-composition")).toHaveCount(0);
      await expect(page.locator(".brand-guide-portrait-edge-bleed")).toHaveCount(0);
      const portraitBox = await portraitScene.boundingBox();
      expect(portraitBox).not.toBeNull();
      if (!portraitBox) throw new Error("portrait coordinate stage has no layout box");
      expect(portraitBox.width / portraitBox.height).toBeCloseTo(6 / 13, 3);
      expect(portraitBox.x + portraitBox.width / 2).toBeCloseTo(frameBox.x + frameBox.width / 2, 0);
      expect(portraitBox.y + portraitBox.height / 2).toBeCloseTo(frameBox.y + frameBox.height / 2, 0);
      expect(portraitBox.width / frameBox.width).toBeGreaterThanOrEqual(.94);
      expect(portraitBox.height / frameBox.height).toBeGreaterThanOrEqual(.94);
      await expectImagesDecodedWithoutStretch(page.locator(".brand-guide-live-stage img"));
    } else if (profile === "portrait-compact") {
      const portraitScene = page.locator(".brand-guide-portrait-scene.is-compact-fallback");
      const composition = page.locator(".brand-guide-artwork > .guide-compact-portrait-composition");
      await expect(portraitScene).toBeVisible();
      await expect(composition).toBeVisible();
      await expect(page.locator(".guide-landscape-composition")).toHaveCount(0);
      const landmarks = composition.locator(".guide-compact-logo, [data-guide-landmark='character'], .guide-compact-envelope, .guide-compact-hint");
      await expect(landmarks).toHaveCount(4);
      await expectLandmarkCoverage(landmarks, frameBox, .9, .82);
      await expectImagesDecodedWithoutStretch(composition.locator("img"));
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
  await expect(routeBuffer.locator(".h5-guide-route-destination-image")).toBeVisible();
  await expect.poll(async () => routeBuffer.locator(".h5-guide-route-destination-image").evaluate((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 750 && element.naturalHeight === 1625;
  })).toBe(true);
  await expectImagesDecodedWithoutStretch(routeBuffer.locator(".h5-guide-route-destination-image"));
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
  await expect(guideBuffer.locator(".h5-guide-route-destination-image")).toHaveCount(1);
  await expect.poll(async () => guideBuffer.locator(".h5-guide-route-destination-image").evaluate((element) => {
    return element instanceof HTMLImageElement && element.complete && element.naturalWidth === 750 && element.naturalHeight === 1625;
  })).toBe(true);
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
  test(`short portrait route snapshot keeps the compact composition at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-guide")).toHaveAttribute("data-guide-profile", "portrait-compact");
    const enter = page.getByRole("button", { name: "进入档案" });
    await expect(enter).toBeEnabled({ timeout: 10000 });
    const buffer = await expectPrimedGuideBuffer(page, "portrait-compact");
    const snapshot = page.locator("#h5-guide-route-buffer-host .h5-guide-route-snapshot.is-compact");
    await expect(snapshot.locator(".h5-guide-route-portrait-snapshot")).toHaveCount(0);
    const composition = snapshot.locator(".guide-compact-portrait-composition");
    const landmarks = composition.locator(".guide-compact-logo, [data-guide-landmark='character'], .guide-compact-envelope, .guide-compact-hint");
    await expect(landmarks).toHaveCount(4);

    // Measure the decoded prime before commit. Sampling snapshotBox and its
    // landmarks after click was racy because the 520ms parent transform kept
    // moving between the two Playwright calls.
    const snapshotBox = await snapshot.boundingBox();
    expect(snapshotBox).not.toBeNull();
    if (!snapshotBox) throw new Error("compact route snapshot has no layout box");
    expect(snapshotBox.x).toBeCloseTo((viewport.width - Math.min(viewport.width, 750)) / 2, 0);
    expect(snapshotBox.y).toBeCloseTo(0, 0);
    expect(snapshotBox?.width).toBeCloseTo(viewport.width, 0);
    expect(snapshotBox?.height).toBeCloseTo(viewport.height, 0);
    await expectLandmarkCoverage(landmarks, snapshotBox, .9, .82);
    await expectImagesDecodedWithoutStretch(composition.locator("img"));

    // Reveal the already primed tree and seek the real CSS transitions. Both
    // full-viewport panels must overlap at every acceptance frame; the compact
    // character and envelope remain visible while the destination takes over.
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
        const character = element.querySelector<HTMLElement>(".guide-compact-character")!;
        const envelope = element.querySelector<HTMLElement>(".guide-compact-envelope")!;
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
          characterVisibleRatio: visibleRatio(character),
          envelopeVisibleRatio: visibleRatio(envelope),
          destinationDecoded: Boolean(destination?.complete && destination.naturalWidth > 0),
        };
      }, progress);
      expect(metrics.guideOpacity + metrics.destinationOpacity).toBeGreaterThanOrEqual(.99);
      expect(metrics.overlap / viewport.height).toBeGreaterThanOrEqual(.73);
      expect(metrics.characterVisibleRatio).toBeGreaterThanOrEqual(.78);
      expect(metrics.envelopeVisibleRatio).toBeGreaterThanOrEqual(.94);
      expect(metrics.destinationDecoded).toBe(true);
      await page.screenshot({ path: `artifacts/portrait-route-snapshot-${viewport.width}x${viewport.height}-${Math.round(progress * 100).toString().padStart(3, "0")}.png` });
    }
    await expectNoHorizontalOverflow(page, viewport.width);
  });
}

for (const viewport of [{ width: 408, height: 740 }, { width: 408, height: 805 }]) {
  test(`real-device portrait uses the compact composition at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    const root = page.locator(".brand-guide");
    const stage = page.locator(".brand-guide-stage");
    await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
    await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 10000 });
    const composition = page.locator(".brand-guide-artwork > .guide-compact-portrait-composition");
    await expect(composition).toBeVisible();
    const [frameBox, fallbackBox] = await Promise.all([
      page.locator(".brand-guide-artwork").boundingBox(),
      page.locator(".brand-guide-portrait-scene.is-compact-fallback").boundingBox(),
    ]);
    expect(frameBox).not.toBeNull();
    expect(fallbackBox).not.toBeNull();
    if (!frameBox || !fallbackBox) throw new Error("compact guide frame has no layout box");
    expect(fallbackBox.x).toBeCloseTo(frameBox.x, 0);
    expect(fallbackBox.width).toBeCloseTo(frameBox.width, 0);
    const landmarks = composition.locator(".guide-compact-logo, [data-guide-landmark='character'], .guide-compact-envelope, .guide-compact-hint");
    await expectLandmarkCoverage(landmarks, frameBox, .9, .82);
    await expectImagesDecodedWithoutStretch(composition.locator("img"));
    await expect(page.locator(".brand-guide-portrait-edge-bleed")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, viewport.width);
  });
}

test("mobile browser toolbar height change keeps the selected compact profile and subject ratios", async ({ page }) => {
  await page.setViewportSize({ width: 408, height: 740 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const root = page.locator(".brand-guide");
  const stage = page.locator(".brand-guide-stage");
  await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
  await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 10000 });
  const composition = page.locator(".brand-guide-artwork > .guide-compact-portrait-composition");
  const character = composition.locator(".guide-compact-character");
  const before = await character.boundingBox();
  expect(before).not.toBeNull();

  await page.setViewportSize({ width: 408, height: 805 });
  await expect(root).toHaveAttribute("data-guide-profile", "portrait-compact");
  const after = await character.boundingBox();
  expect(after).not.toBeNull();
  expect((after?.width ?? 0) / Math.max(1, after?.height ?? 1)).toBeCloseTo((before?.width ?? 0) / Math.max(1, before?.height ?? 1), 3);
  await expectImagesDecodedWithoutStretch(composition.locator("img"));
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
    if (profile === "portrait-standard") {
      const scene = page.locator(".brand-guide-portrait-scene");
      const sceneBox = await scene.boundingBox();
      expect(sceneBox).not.toBeNull();
      expect((sceneBox?.width ?? 0) / Math.max(1, sceneBox?.height ?? 1)).toBeCloseTo(6 / 13, 3);
      await expectImagesDecodedWithoutStretch(page.locator(".brand-guide-live-stage img"));
    } else {
      const composition = page.locator(".brand-guide-artwork > .guide-compact-portrait-composition");
      await expect(composition).toBeVisible();
      await expectImagesDecodedWithoutStretch(composition.locator("img"));
    }
    await expectNoHorizontalOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/design-qa/guide-visual-contract-${viewport.width}x${viewport.height}.png`, animations: "disabled" });
  });
}

test("cold-cache standard guide keeps the complete fallback until every live layer decodes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const delayedNames = new Set([
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
  await expect(page.locator(".brand-guide .motion-stage, .brand-guide-window-mask, .runtime-loading-layer")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/design-qa/guide-cold-cache-fallback-375x812.png" });
  await expect(stage).toHaveAttribute("data-load-state", "ready", { timeout: 15000 });
  await expect(liveStage).toHaveCSS("opacity", "1");
  await expect(fallback).toHaveCSS("opacity", "0");
  await expectImagesDecodedWithoutStretch(liveStage.locator("img"));
});

test("guide keeps the complete source fallback when the destination preview cannot decode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/design/guide/archive-transition-preview.webp", (route) => route.abort());
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
  // Keep a terminal marker after the route buffer leaves so deferred archive
  // artwork cannot replay the staged entry animation as it mounts.
  await expect(archive).toHaveAttribute("data-guide-entry", "complete");
  await expect(archive).not.toHaveAttribute("aria-busy", "true");
  await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  await expect(runtimeLoadingLayer).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/design-qa/archive-after-guide-375x812.png" });
});
