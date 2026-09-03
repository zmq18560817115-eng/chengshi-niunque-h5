import { expect, test } from "@playwright/test";
import type { Locator, Page, Request, Response, TestInfo } from "@playwright/test";

const targetViewports = [
  { name: "portrait-320x568", width: 320, height: 568 },
  { name: "portrait-375x812", width: 375, height: 812 },
  { name: "portrait-393x852", width: 393, height: 852 },
  { name: "portrait-440x820", width: 440, height: 820 },
  { name: "landscape-667x375", width: 667, height: 375 },
  { name: "landscape-844x390", width: 844, height: 390 },
  { name: "landscape-956x440", width: 956, height: 440 },
] as const;

const transitionProgress = [0, 0.25, 0.5, 0.75, 1] as const;
const expectedMaximumFrameWidth = 750;

type CriticalResourceFailure = {
  kind: "http" | "network";
  method: string;
  status?: number;
  url: string;
  error?: string;
};

type TransitionMetric = {
  progress: number;
  coverage: number;
  overlap: number;
  guideOpacity: number;
  destinationOpacity: number;
  blurredRoots: string[];
};

declare global {
  interface Window {
    __p1HandoffProbe?: {
      running: boolean;
      samples: Array<{ at: number; coverage: number; active: string[]; path: string; routeState: string | null; bufferCount: number }>;
    };
  }
}

function isCriticalResource(url: string) {
  const parsed = new URL(url);
  return parsed.pathname.startsWith("/design/")
    || parsed.pathname.startsWith("/_next/")
    || parsed.pathname.startsWith("/reports/image/")
    || parsed.pathname === "/api/public/content";
}

function watchCriticalResources(page: Page, expectedFailure?: (request: Request) => boolean) {
  const failures: CriticalResourceFailure[] = [];
  const onResponse = (response: Response) => {
    const request = response.request();
    if (!isCriticalResource(response.url()) || expectedFailure?.(request)) return;
    if (response.status() >= 400) {
      failures.push({
        kind: "http",
        method: request.method(),
        status: response.status(),
        url: response.url(),
      });
    }
  };
  const onRequestFailed = (request: Request) => {
    if (!isCriticalResource(request.url()) || expectedFailure?.(request)) return;
    failures.push({
      kind: "network",
      method: request.method(),
      url: request.url(),
      error: request.failure()?.errorText,
    });
  };
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  return {
    failures,
    stop() {
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

async function dispatchSingleTouch(root: Locator, type: "touchstart" | "touchmove" | "touchend", x: number, y: number) {
  await root.evaluate((element, eventInit) => {
    if (typeof Touch !== "function" || typeof TouchEvent !== "function") {
      throw new Error("This browser project does not expose native Touch/TouchEvent constructors");
    }
    const point = new Touch({
      identifier: 1,
      target: element,
      clientX: eventInit.x,
      clientY: eventInit.y,
      pageX: eventInit.x + window.scrollX,
      pageY: eventInit.y + window.scrollY,
      screenX: eventInit.x,
      screenY: eventInit.y,
    });
    const activeTouches = eventInit.type === "touchend" ? [] : [point];
    const event = new TouchEvent(eventInit.type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      touches: activeTouches,
      targetTouches: activeTouches,
      changedTouches: [point],
    });
    element.dispatchEvent(event);
  }, { type, x, y });
}

async function expectNoHorizontalOverflow(page: Page, viewportWidth: number) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.clientWidth).toBe(viewportWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
}

async function expectDecodedImages(root: Locator, selector = "img", minimum = 1) {
  await expect.poll(async () => root.locator(selector).evaluateAll(async (images, imageMinimum) => {
    if (images.length < imageMinimum) return false;
    const decoded = await Promise.all(images.map(async (node) => {
      if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0 || node.naturalHeight <= 0) return false;
      if (typeof node.decode === "function") {
        try {
          await node.decode();
        } catch {
          return false;
        }
      }
      return true;
    }));
    return decoded.every(Boolean);
  }, minimum), { timeout: 20_000 }).toBe(true);
}

async function expectFrameWidth(locator: Locator, viewportWidth: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("content frame has no layout box");
  const expectedWidth = Math.min(viewportWidth, expectedMaximumFrameWidth);
  expect(box.width).toBeCloseTo(expectedWidth, 0);
  expect(box.x).toBeCloseTo((viewportWidth - expectedWidth) / 2, 0);
  return box;
}

async function alphaGeometry(image: Locator, stage: Locator) {
  return image.evaluate(async (node, stageElement) => {
    if (!(node instanceof HTMLImageElement) || !(stageElement instanceof HTMLElement)) return null;
    if (!node.complete || node.naturalWidth <= 0 || node.naturalHeight <= 0) return null;
    if (typeof node.decode === "function") await node.decode();

    const sampleScale = Math.min(1, 192 / Math.max(node.naturalWidth, node.naturalHeight));
    const sampleWidth = Math.max(1, Math.round(node.naturalWidth * sampleScale));
    const sampleHeight = Math.max(1, Math.round(node.naturalHeight * sampleScale));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(node, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        if (pixels[(y * sampleWidth + x) * 4 + 3] <= 12) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;

    const imageRect = node.getBoundingClientRect();
    const stageRect = stageElement.getBoundingClientRect();
    const style = getComputedStyle(node);
    const widthScale = imageRect.width / node.naturalWidth;
    const heightScale = imageRect.height / node.naturalHeight;
    let scaleX = widthScale;
    let scaleY = heightScale;
    if (style.objectFit === "contain" || style.objectFit === "cover") {
      const uniformScale = style.objectFit === "contain"
        ? Math.min(widthScale, heightScale)
        : Math.max(widthScale, heightScale);
      scaleX = uniformScale;
      scaleY = uniformScale;
    }
    const renderedWidth = node.naturalWidth * scaleX;
    const renderedHeight = node.naturalHeight * scaleY;
    const [positionX = "50%", positionY = "50%"] = style.objectPosition.split(/\s+/);
    const offsetFor = (position: string, freeSpace: number) => {
      if (position.endsWith("%")) return freeSpace * Number.parseFloat(position) / 100;
      const pixelsValue = Number.parseFloat(position);
      return Number.isFinite(pixelsValue) ? pixelsValue : freeSpace / 2;
    };
    const renderLeft = imageRect.left + offsetFor(positionX, imageRect.width - renderedWidth);
    const renderTop = imageRect.top + offsetFor(positionY, imageRect.height - renderedHeight);
    const alphaLeft = renderLeft + (minX / sampleWidth) * renderedWidth;
    const alphaTop = renderTop + (minY / sampleHeight) * renderedHeight;
    const alphaRight = renderLeft + ((maxX + 1) / sampleWidth) * renderedWidth;
    const alphaBottom = renderTop + ((maxY + 1) / sampleHeight) * renderedHeight;
    const visibleLeft = Math.max(stageRect.left, alphaLeft);
    const visibleTop = Math.max(stageRect.top, alphaTop);
    const visibleRight = Math.min(stageRect.right, alphaRight);
    const visibleBottom = Math.min(stageRect.bottom, alphaBottom);
    const alphaWidth = Math.max(1, alphaRight - alphaLeft);
    const alphaHeight = Math.max(1, alphaBottom - alphaTop);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    return {
      visibleFraction: (visibleWidth * visibleHeight) / (alphaWidth * alphaHeight),
      occupiedWidth: visibleWidth / Math.max(1, stageRect.width),
      occupiedHeight: visibleHeight / Math.max(1, stageRect.height),
    };
  }, await stage.elementHandle());
}

async function expectGuideSubjectOccupancy(page: Page) {
  const stage = page.locator(".brand-guide-stage");
  const artwork = page.locator(".brand-guide-artwork");
  const stageBox = await artwork.boundingBox();
  expect(stageBox).not.toBeNull();
  if (!stageBox) throw new Error("guide subject geometry is unavailable");
  const profile = await page.locator(".brand-guide").getAttribute("data-guide-profile");

  if (profile === "landscape") {
    const composition = artwork.locator(":scope > .guide-landscape-composition");
    await expect(composition).toBeVisible();
    await expectDecodedImages(artwork, ":scope > .guide-landscape-composition img", 6);
    const compositionBox = await composition.boundingBox();
    expect(compositionBox).not.toBeNull();
    if (!compositionBox) throw new Error("landscape composition has no layout box");
    expect(compositionBox.width).toBeCloseTo(stageBox.width, 0);
    expect(compositionBox.height).toBeCloseTo(stageBox.height, 0);
  } else {
    expect(["portrait-standard", "portrait-compact"]).toContain(profile);
    const scene = artwork.locator(":scope > .brand-guide-portrait-scene");
    const liveStage = scene.locator(":scope > .brand-guide-live-stage");
    const canvasLayers = liveStage.locator(".brand-guide-window-mask, .brand-guide-arch, .brand-guide-paper, .brand-guide-character, .brand-guide-foreground-top");
    await expect(scene).toBeVisible();
    await expect(scene).not.toHaveClass(/is-compact-fallback/);
    await expect(artwork.locator(":scope > .guide-compact-portrait-composition")).toHaveCount(0);
    await expectDecodedImages(liveStage, "img", 10);
    await expect(canvasLayers).toHaveCount(9);
    const sceneBox = await scene.boundingBox();
    expect(sceneBox).not.toBeNull();
    if (!sceneBox) throw new Error("portrait scene has no layout box");
    expect(sceneBox.width / sceneBox.height).toBeCloseTo(6 / 13, 3);
    expect(sceneBox.x + sceneBox.width / 2).toBeCloseTo(stageBox.x + stageBox.width / 2, 0);
    expect(sceneBox.y + sceneBox.height / 2).toBeCloseTo(stageBox.y + stageBox.height / 2, 0);
    expect(sceneBox.width).toBeLessThanOrEqual(stageBox.width + 1);
    expect(sceneBox.height).toBeLessThanOrEqual(stageBox.height + 1);
    expect(Math.max(sceneBox.width / stageBox.width, sceneBox.height / stageBox.height)).toBeGreaterThanOrEqual(.99);
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
    const character = artwork.locator(".brand-guide-character-open");
    const envelope = artwork.locator(".brand-guide-paper-bottom");
    await expect(character).toBeAttached();
    await expect(envelope).toBeAttached();
    const [characterGeometry, envelopeGeometry] = await Promise.all([
      alphaGeometry(character, stage),
      alphaGeometry(envelope, stage),
    ]);
    expect(characterGeometry).not.toBeNull();
    expect(envelopeGeometry).not.toBeNull();
    if (!characterGeometry || !envelopeGeometry) throw new Error("portrait subject geometry is unavailable");
    expect(characterGeometry.occupiedWidth).toBeGreaterThanOrEqual(0.42);
    expect(characterGeometry.visibleFraction).toBeGreaterThanOrEqual(0.62);
    expect(envelopeGeometry.occupiedWidth).toBeGreaterThanOrEqual(0.44);
    expect(envelopeGeometry.visibleFraction).toBeGreaterThanOrEqual(0.58);
  }

  const hintSelector = profile === "landscape"
    ? ":scope > .guide-landscape-composition .guide-landscape-hint"
    : ".brand-guide-entry-hint";
  const hint = artwork.locator(hintSelector);
  await expect(hint).toBeVisible();
  const hintBox = await hint.boundingBox();
  expect(hintBox).not.toBeNull();
  if (!hintBox) throw new Error("guide hint geometry is unavailable");
  const hintVisibleWidth = Math.max(0, Math.min(stageBox.x + stageBox.width, hintBox.x + hintBox.width) - Math.max(stageBox.x, hintBox.x));
  const hintVisibleHeight = Math.max(0, Math.min(stageBox.y + stageBox.height, hintBox.y + hintBox.height) - Math.max(stageBox.y, hintBox.y));
  expect((hintVisibleWidth * hintVisibleHeight) / Math.max(1, hintBox.width * hintBox.height)).toBeGreaterThanOrEqual(0.94);
  expect(hintBox.width / stageBox.width).toBeGreaterThanOrEqual(0.26);
}

async function readTransitionMetric(page: Page): Promise<TransitionMetric> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".brand-guide");
    const guide = document.querySelector<HTMLElement>(".brand-guide-stage");
    const guideArtwork = document.querySelector<HTMLElement>(".brand-guide-artwork");
    const destination = document.querySelector<HTMLElement>(".brand-guide-destination-preview");
    const destinationImage = document.querySelector<HTMLElement>(".brand-guide-destination-image");
    if (!root || !guide || !guideArtwork || !destination || !destinationImage) throw new Error("guide transition layers are unavailable");
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const viewportArea = Math.max(1, viewportWidth * viewportHeight);
    const guideRect = guide.getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();
    const guideOpacity = Number.parseFloat(getComputedStyle(guide).opacity);
    const destinationOpacity = Number.parseFloat(getComputedStyle(destination).opacity);
    const area = (rect: DOMRect) => {
      const width = Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
      const height = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
      return width * height;
    };
    const effectiveOpacity = (element: Element) => {
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
    // Texture/background panels deliberately do not count as content. The
    // regression being guarded was a fully painted frame whose only visible
    // pixels were the two paper textures while both page subjects vanished.
    const profile = root.dataset.guideProfile;
    const guideSubjectSelectors = profile === "landscape"
        ? [".brand-guide-artwork > .guide-landscape-composition"]
        : [".brand-guide-artwork .brand-guide-character-open", ".brand-guide-artwork .brand-guide-paper-bottom"];
    const subjectElements = [
      ...guideSubjectSelectors,
      ".brand-guide-fallback",
      ".brand-guide-destination-image",
    ].flatMap((selector) => [...document.querySelectorAll(selector)]);
    const subjectCoverage = Math.min(1, subjectElements.reduce((sum, element) => {
      if (element instanceof HTMLImageElement
        && (!element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0)) return sum;
      return sum + area(element.getBoundingClientRect()) * effectiveOpacity(element);
    }, 0) / viewportArea);
    const overlapWidth = Math.max(0, Math.min(guideRect.right, destinationRect.right) - Math.max(guideRect.left, destinationRect.left));
    const overlapHeight = Math.max(0, Math.min(guideRect.bottom, destinationRect.bottom) - Math.max(guideRect.top, destinationRect.top));
    const inspectedRoots = [root, guide, guideArtwork, destination, destinationImage];
    return {
      progress: Number(root.dataset.swipeProgress),
      coverage: subjectCoverage,
      overlap: (overlapWidth * overlapHeight) / viewportArea,
      guideOpacity,
      destinationOpacity,
      blurredRoots: inspectedRoots.flatMap((element) => {
        const filter = getComputedStyle(element).filter;
        return /blur\(/.test(filter) ? [`${element.className}: ${filter}`] : [];
      }),
    };
  });
}

async function captureEvidence(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
}

async function startHandoffCoverageProbe(page: Page) {
  await page.evaluate(() => {
    const viewportArea = () => Math.max(1, document.documentElement.clientWidth * document.documentElement.clientHeight);
    const effectiveOpacity = (element: Element) => {
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
    const visibleAreaInViewport = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(0, Math.min(document.documentElement.clientWidth, rect.right) - Math.max(0, rect.left));
      const height = Math.max(0, Math.min(document.documentElement.clientHeight, rect.bottom) - Math.max(0, rect.top));
      return width * height;
    };
    const probe = { running: true, samples: [] as Array<{ at: number; coverage: number; active: string[]; path: string; routeState: string | null; bufferCount: number }> };
    window.__p1HandoffProbe = probe;
    const sample = () => {
      if (!probe.running) return;
      const candidates = [
        ".brand-guide-artwork .brand-guide-character-open",
        ".brand-guide-artwork .brand-guide-paper-bottom",
        ".brand-guide-fallback",
        ".brand-guide-artwork > .guide-landscape-composition",
        ".brand-guide-destination-image",
        ".h5-guide-route-snapshot",
        ".h5-guide-route-destination-image",
        ".reports-archive-reference-fallback",
        '.reports-archive-source-layer:not([data-source-part="paper-texture"])',
      ].flatMap((selector) => [...document.querySelectorAll(selector)]);
      const active: string[] = [];
      let weightedCoverage = 0;
      for (const element of candidates) {
        if (element instanceof HTMLImageElement
          && (!element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0)) continue;
        const opacity = effectiveOpacity(element);
        const area = visibleAreaInViewport(element);
        if (opacity <= 0 || area <= 0) continue;
        active.push(element.className.toString());
        weightedCoverage += area * opacity;
      }
      probe.samples.push({
        at: performance.now(),
        coverage: Math.min(1, weightedCoverage / viewportArea()),
        active,
        path: window.location.pathname,
        routeState: document.documentElement.getAttribute("data-guide-route-entry"),
        bufferCount: document.querySelectorAll("#h5-guide-route-buffer-host > .h5-guide-route-buffer").length,
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopHandoffCoverageProbe(page: Page) {
  return page.evaluate(() => {
    const probe = window.__p1HandoffProbe;
    if (!probe) return [];
    probe.running = false;
    return probe.samples;
  });
}

for (const viewport of targetViewports) {
  test(`${viewport.name} preserves composition and all five handoff states`, async ({ page }, testInfo) => {
    const resources = watchCriticalResources(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/go", { waitUntil: "domcontentloaded" });

    const root = page.locator(".brand-guide");
    const stage = page.locator(".brand-guide-stage");
    const destination = page.locator(".brand-guide-destination-preview");
    await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15_000 });
    await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
    await expectDecodedImages(root, ".brand-guide-artwork img, .brand-guide-destination-preview img", 3);
    const guideFrame = await expectFrameWidth(stage.locator(".brand-guide-artwork"), viewport.width);
    const destinationFrame = await expectFrameWidth(destination.locator(".brand-guide-destination-content"), viewport.width);
    expect(destinationFrame.width).toBeCloseTo(guideFrame.width, 0);
    expect(destinationFrame.x).toBeCloseTo(guideFrame.x, 0);
    await expectNoHorizontalOverflow(page, viewport.width);
    await expectGuideSubjectOccupancy(page);

    const states: TransitionMetric[] = [];
    const initial = await readTransitionMetric(page);
    states.push(initial);
    await captureEvidence(page, testInfo, `${viewport.name}-transition-000`);

    const startX = Math.round(viewport.width / 2);
    const startY = viewport.height - 8;
    // Drive React's touch handlers directly. This works in Chromium and
    // WebKit without binding the contract to one device UA or CDP-only input.
    await dispatchSingleTouch(root, "touchstart", startX, startY);
    for (const progress of transitionProgress.slice(1)) {
      const expectedProgress = progress === 1 ? startY / viewport.height : progress;
      const targetY = Math.max(0, startY - viewport.height * progress);
      await dispatchSingleTouch(root, "touchmove", startX, targetY);
      await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeGreaterThanOrEqual(expectedProgress - 0.035);
      await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeLessThanOrEqual(expectedProgress + 0.035);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const state = await readTransitionMetric(page);
      states.push(state);
      await captureEvidence(page, testInfo, `${viewport.name}-transition-${String(progress * 100).padStart(3, "0")}`);
    }

    expect(states).toHaveLength(5);
    expect(states[0].guideOpacity).toBeGreaterThanOrEqual(0.94);
    expect(states.at(-1)?.destinationOpacity).toBeGreaterThanOrEqual(0.94);
    for (let index = 0; index < states.length; index += 1) {
      const state = states[index];
      expect(state.blurredRoots, `full-frame blur at ${transitionProgress[index] * 100}%`).toEqual([]);
      expect(state.coverage, `painted coverage at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.78);
      if (index > 0) {
        expect(state.guideOpacity).toBeLessThanOrEqual(states[index - 1].guideOpacity + 0.03);
        expect(state.destinationOpacity).toBeGreaterThanOrEqual(states[index - 1].destinationOpacity - 0.03);
      }
      if (index > 0 && index < states.length - 1) {
        expect(state.guideOpacity).toBeGreaterThan(0.06);
        expect(state.destinationOpacity).toBeGreaterThan(0.16);
        expect(state.overlap, `spatial overlap at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.12);
      }
    }

    await startHandoffCoverageProbe(page);
    await dispatchSingleTouch(root, "touchend", startX, 0);
    const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
    await expect(routeBuffer).toBeVisible({ timeout: 5_000 });
    const routeProfile = await root.getAttribute("data-guide-profile") ?? "portrait-standard";
    await expect(routeBuffer).toHaveAttribute("data-guide-profile", routeProfile);
    await expect(routeBuffer).toHaveAttribute("data-commit-state", /^(prepared|committing)$/);
    await expectDecodedImages(routeBuffer, "img", 2);
    if (routeProfile === "portrait-standard" || routeProfile === "portrait-compact") {
      const routeSnapshot = routeBuffer.locator(".h5-guide-route-snapshot");
      const routeSnapshotImage = routeSnapshot.locator(".h5-guide-route-portrait-snapshot");
      await expect(routeSnapshotImage).toHaveCount(1);
      await expect(routeSnapshot.locator(".guide-compact-portrait-composition")).toHaveCount(0);
      const routeSnapshotBox = await routeSnapshot.boundingBox();
      expect(routeSnapshotBox).not.toBeNull();
      if (!routeSnapshotBox) throw new Error("portrait route snapshot has no layout box");
      expect(routeSnapshotBox.width / routeSnapshotBox.height).toBeCloseTo(6 / 13, 3);
      expect(routeSnapshotBox.x + routeSnapshotBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
      expect(routeSnapshotBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(routeSnapshotBox.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(Math.max(routeSnapshotBox.width / viewport.width, routeSnapshotBox.height / viewport.height)).toBeGreaterThanOrEqual(.99);
      await expect.poll(async () => routeSnapshotImage.evaluate((element) => element instanceof HTMLImageElement
        && element.complete
        && element.naturalWidth === 750
        && element.naturalHeight === 1625
        && getComputedStyle(element).objectFit === "fill")).toBe(true);
    } else {
      await expect(routeBuffer.locator(".h5-guide-route-portrait-snapshot")).toHaveCount(0);
    }
    await expect(routeBuffer.locator(".h5-guide-route-destination-image")).toHaveAttribute("data-decode-state", "ready");
    const routeDestinationBox = await routeBuffer.locator(".h5-guide-route-destination-image").boundingBox();
    expect(routeDestinationBox).not.toBeNull();
    if (!routeDestinationBox) throw new Error("route destination frame has no box");
    expect(routeDestinationBox.width).toBeCloseTo(guideFrame.width, 0);
    expect(routeDestinationBox.x).toBeCloseTo(guideFrame.x, 0);

    await page.waitForURL(/\/reports$/, { timeout: 15_000 });
    const archive = page.locator(".reports-archive-final");
    await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
    await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
    await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
    await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
    const archiveBox = await expectFrameWidth(archive, viewport.width);
    expect(archiveBox.width).toBeCloseTo(guideFrame.width, 0);
    expect(archiveBox.x).toBeCloseTo(guideFrame.x, 0);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const handoffSamples = await stopHandoffCoverageProbe(page);
    expect(handoffSamples.length).toBeGreaterThan(4);
    const emptySamples = handoffSamples.filter((sample) => sample.coverage < 0.72);
    expect(emptySamples, `handoff samples with insufficient painted content: ${JSON.stringify(emptySamples.slice(0, 5))}`).toEqual([]);
    await captureEvidence(page, testInfo, `${viewport.name}-transition-complete`);
    await expectNoHorizontalOverflow(page, viewport.width);
    resources.stop();
    expect(resources.failures).toEqual([]);
  });
}

test("canonical guide still matches the approved 750px visual baseline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-chromium", "one engine owns the pixel baseline; both engines run geometry gates");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 750, height: 1624 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const stage = page.locator(".brand-guide-stage");
  await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  await expectDecodedImages(stage, "img", 1);
  await expect(stage).toHaveScreenshot("source-guide-normalized-750x1624.png", {
    animations: "disabled",
    scale: "css",
    maxDiffPixelRatio: 0.025,
  });
});

test("archive fallback survives delayed decode, failed assets, and a clean retry", async ({ page }) => {
  const blockedAsset = /\/module-1-title(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  let releaseAsset!: () => void;
  const assetReleased = new Promise<void>((resolve) => { releaseAsset = resolve; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route(blockedAsset, async (route) => {
    await assetReleased;
    await route.continue();
  });
  await page.goto("/reports", { waitUntil: "domcontentloaded" });
  const archive = page.locator(".reports-archive-final");
  const fallback = page.locator(".reports-archive-reference-fallback");
  await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false");
  await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  await expect(fallback).toBeVisible();
  await page.waitForTimeout(350);
  await expect(fallback).toBeVisible();
  releaseAsset();
  await page.unrouteAll({ behavior: "wait" });
  await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  await expect(fallback).toBeHidden();
  await expect(fallback).toHaveAttribute("data-fallback-image", "released");
  await expect(fallback.locator("img")).toHaveCount(0);

  const failedAsset = /\/module-1-badge(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  const expectedFailure = (request: Request) => failedAsset.test(request.url());
  const resources = watchCriticalResources(page, expectedFailure);
  await page.route(failedAsset, (route) => route.abort("failed"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false", { timeout: 15_000 });
  await expect(archive).toHaveAttribute("data-archive-artwork-failed", "true", { timeout: 15_000 });
  await expect(fallback).toBeVisible();
  const fallbackBox = await fallback.boundingBox();
  const archiveBox = await archive.boundingBox();
  expect(fallbackBox).not.toBeNull();
  expect(archiveBox).not.toBeNull();
  if (!fallbackBox || !archiveBox) throw new Error("archive fallback has no layout box");
  expect(fallbackBox.width).toBeGreaterThanOrEqual(archiveBox.width * 0.98);

  await page.unroute(failedAsset);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  resources.stop();
  expect(resources.failures).toEqual([]);
});

test("cold and warm production-cache journeys decode every requested visual asset", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const resources = watchCriticalResources(page);
  const observedAssetUrls = new Set<string>();
  const warmCacheEvidence: Array<{ label: string; name: string; transferSize: number; encodedBodySize: number; deliveryType: string }> = [];
  const rememberRenderedAssets = async () => {
    const current = await page.locator("img").evaluateAll((images) => images
      .map((image) => (image as HTMLImageElement).currentSrc)
      .filter(Boolean));
    current.forEach((url) => observedAssetUrls.add(url));
  };
  const rememberWarmCacheEvidence = async (label: string) => {
    const entries = await page.evaluate(() => (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => new URL(entry.name).pathname.startsWith("/design/"))
      .map((entry) => ({
        name: entry.name,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        deliveryType: (entry as PerformanceResourceTiming & { deliveryType?: string }).deliveryType ?? "",
      })));
    expect(entries.length, `${label} must expose design-asset resource timing`).toBeGreaterThan(0);
    const cacheHits = entries.filter((entry) => entry.deliveryType === "cache" || entry.transferSize === 0);
    expect(cacheHits.length, `${label} must include a browser-cache hit: ${JSON.stringify(entries)}`).toBeGreaterThan(0);
    warmCacheEvidence.push(...entries.map((entry) => ({ label, ...entry })));
  };

  await test.step("cold cache", async () => {
    await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" });
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
    await expectDecodedImages(page.locator(".brand-guide"), "img", 3);
    await rememberRenderedAssets();
    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    const archive = page.locator(".reports-archive-final");
    await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
    await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
    await rememberRenderedAssets();
  });

  await test.step("warm cache", async () => {
    await page.setExtraHTTPHeaders({});
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
    await expectDecodedImages(page.locator(".brand-guide"), "img", 3);
    await rememberWarmCacheEvidence("warm guide navigation");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
    await expectDecodedImages(page.locator(".brand-guide"), "img", 3);
    await rememberWarmCacheEvidence("warm guide reload");
    await rememberRenderedAssets();
    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    const archive = page.locator(".reports-archive-final");
    await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
    await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
    await rememberWarmCacheEvidence("warm archive navigation");
    await rememberRenderedAssets();
  });

  const warmReloadEvidence = warmCacheEvidence.filter((entry) => entry.label === "warm guide reload");
  const warmReloadHits = warmReloadEvidence.filter((entry) => entry.deliveryType === "cache" || entry.transferSize === 0);
  expect(warmReloadEvidence.length, "the repeated guide navigation must expose timing evidence").toBeGreaterThan(3);
  expect(warmReloadHits.length / warmReloadEvidence.length, JSON.stringify(warmReloadEvidence)).toBeGreaterThanOrEqual(0.8);
  expect(new Set(warmReloadHits.map((entry) => new URL(entry.name).pathname)).size, "multiple distinct guide assets must be served from browser cache").toBeGreaterThan(3);

  const assetUrls = [...observedAssetUrls];
  expect(assetUrls.length).toBeGreaterThan(2);
  for (const url of assetUrls) {
    const response = await request.head(url);
    expect(response.status(), url).toBeLessThan(400);
    if (new URL(url).pathname.startsWith("/design/")) {
      const cacheControl = response.headers()["cache-control"] ?? "";
      const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl)?.[1];
      expect(maxAge, `${url} cache policy: ${cacheControl}`).toBeDefined();
      expect(Number(maxAge), `${url} must have a positive browser cache TTL`).toBeGreaterThan(0);
    }
  }
  resources.stop();
  expect(resources.failures).toEqual([]);
});
