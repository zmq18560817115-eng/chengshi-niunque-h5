import { expect, test, type Page } from "@playwright/test";

const portraitViewports = [
  { width: 320, height: 568, profile: "portrait-compact" },
  { width: 375, height: 812, profile: "portrait-standard" },
  { width: 393, height: 852, profile: "portrait-standard" },
  { width: 440, height: 820, profile: "portrait-compact" },
] as const;

const landscapeViewports = [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 956, height: 440 },
] as const;

const evidenceRoot = "artifacts/design-qa/guide-responsive-v2";

async function waitForGuide(page: Page) {
  const stage = page.locator(".brand-guide-stage");
  await expect(stage).toHaveAttribute("data-swipe-state", "ready", { timeout: 15_000 });
  await expect(stage).toHaveAttribute("data-gesture-state", "ready");
  return stage;
}

async function expectNoViewportOverflow(page: Page, width: number) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.clientWidth).toBe(width);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(width);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(width);
}

async function expectVisibleImagesDecodedWithoutStretch(page: Page) {
  const images = await page.locator(".brand-guide-artwork img:visible").evaluateAll((elements) => elements.map((element) => {
    const image = element as HTMLImageElement;
    const box = image.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
    const renderedRatio = box.width / Math.max(1, box.height);
    return {
      className: image.className,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      naturalRatio,
      renderedRatio,
      fit: getComputedStyle(image).objectFit,
    };
  }));
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    expect(image.complete, image.className).toBe(true);
    expect(image.naturalWidth, image.className).toBeGreaterThan(0);
    if (image.fit === "fill") expect(Math.abs(image.naturalRatio - image.renderedRatio), image.className).toBeLessThan(.012);
  }
}

for (const viewport of portraitViewports) {
  test(`portrait composition preserves artwork at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/design/") && response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await waitForGuide(page);
    await expect(page.locator(".brand-guide")).toHaveAttribute("data-guide-profile", viewport.profile);
    await expectNoViewportOverflow(page, viewport.width);
    await expectVisibleImagesDecodedWithoutStretch(page);

    if (viewport.profile === "portrait-standard") {
      const scene = page.locator(".brand-guide-portrait-scene");
      const box = await scene.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.width ?? 0) / Math.max(1, box?.height ?? 1)).toBeCloseTo(6 / 13, 3);
      await expect(page.locator(".guide-compact-portrait-composition")).toHaveCount(0);
    } else {
      const compact = page.locator(".brand-guide-artwork > .guide-compact-portrait-composition");
      await expect(compact).toBeVisible();
      const landmarks = compact.locator(".guide-compact-logo, [data-guide-landmark='character'], .guide-compact-envelope, .guide-compact-hint");
      await expect(landmarks).toHaveCount(4);
      const union = await landmarks.evaluateAll((elements) => {
        const boxes = elements.map((element) => element.getBoundingClientRect());
        return {
          left: Math.min(...boxes.map((box) => box.left)),
          top: Math.min(...boxes.map((box) => box.top)),
          right: Math.max(...boxes.map((box) => box.right)),
          bottom: Math.max(...boxes.map((box) => box.bottom)),
        };
      });
      expect((union.right - union.left) / viewport.width).toBeGreaterThan(.92);
      expect((union.bottom - union.top) / viewport.height).toBeGreaterThan(.84);
    }

    await page.screenshot({ path: `${evidenceRoot}/${viewport.width}x${viewport.height}-initial.png` });
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
  });
}

for (const viewport of landscapeViewports) {
  test(`landscape composition preserves all landmarks at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await waitForGuide(page);
    await expect(page.locator(".brand-guide")).toHaveAttribute("data-guide-profile", "landscape");
    const composition = page.locator(".brand-guide-artwork > .guide-landscape-composition");
    await expect(composition).toBeVisible();
    const landmarks = composition.locator("[data-guide-landmark]");
    await expect(landmarks).toHaveCount(4);
    const coverage = await landmarks.evaluateAll((elements) => {
      const boxes = elements.map((element) => element.getBoundingClientRect());
      return {
        left: Math.min(...boxes.map((box) => box.left)),
        top: Math.min(...boxes.map((box) => box.top)),
        right: Math.max(...boxes.map((box) => box.right)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
      };
    });
    const artworkBox = await page.locator(".brand-guide-artwork").boundingBox();
    expect(artworkBox).not.toBeNull();
    expect(artworkBox?.width).toBeCloseTo(Math.min(viewport.width, 750), 0);
    expect((coverage.right - coverage.left) / Math.max(1, artworkBox?.width ?? 1)).toBeGreaterThan(.9);
    expect((coverage.bottom - coverage.top) / viewport.height).toBeGreaterThan(.78);
    await expectVisibleImagesDecodedWithoutStretch(page);
    await expectNoViewportOverflow(page, viewport.width);
    await page.screenshot({ path: `${evidenceRoot}/${viewport.width}x${viewport.height}-initial.png` });
  });
}

test("gesture progress keeps both decoded panels spatially overlapped", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  await waitForGuide(page);
  const root = page.locator(".brand-guide");
  const startY = 811;
  await page.mouse.move(188, startY);
  await page.mouse.down();
  await page.screenshot({ path: `${evidenceRoot}/375x812-progress-000.png` });

  for (const progress of [.25, .5, .75]) {
    await page.mouse.move(188, startY - 812 * progress, { steps: 10 });
    await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeCloseTo(progress, 1);
    const visual = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>(".brand-guide-stage")!;
      const destination = document.querySelector<HTMLElement>(".brand-guide-destination-preview")!;
      const guideBox = guide.getBoundingClientRect();
      const destinationBox = destination.getBoundingClientRect();
      return {
        guideOpacity: Number(getComputedStyle(guide).opacity),
        destinationOpacity: Number(getComputedStyle(destination).opacity),
        overlap: Math.max(0, Math.min(guideBox.bottom, destinationBox.bottom) - Math.max(guideBox.top, destinationBox.top)),
        destinationDecoded: (destination.querySelector("img") as HTMLImageElement | null)?.complete === true,
      };
    });
    expect(visual.guideOpacity + visual.destinationOpacity).toBeGreaterThanOrEqual(.99);
    expect(visual.overlap / 812).toBeGreaterThanOrEqual(.73);
    expect(visual.destinationDecoded).toBe(true);
    await page.screenshot({ path: `${evidenceRoot}/375x812-progress-${Math.round(progress * 100).toString().padStart(3, "0")}.png` });
  }

  await page.mouse.up();
  await page.waitForURL(/\/reports$/);
  const buffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  await expect(buffer).toBeVisible();
  await expect(buffer.locator("img")).not.toHaveCount(0);
  await expect.poll(async () => buffer.locator("img").evaluateAll((images) => images.every((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  }))).toBe(true);
  await page.screenshot({ path: `${evidenceRoot}/375x812-progress-100.png` });
});

test("mobile browser toolbar resize does not switch composition or distort the subject", async ({ page }) => {
  await page.setViewportSize({ width: 408, height: 740 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  await waitForGuide(page);
  const root = page.locator(".brand-guide");
  const before = await root.getAttribute("data-guide-profile");
  await page.setViewportSize({ width: 408, height: 805 });
  await page.waitForTimeout(100);
  await expect(root).toHaveAttribute("data-guide-profile", before ?? "portrait-compact");
  await expectVisibleImagesDecodedWithoutStretch(page);
});

test("cold cache keeps the complete fallback until every visible layer is decoded", async ({ page }) => {
  const delayed = new Set([
    "guide-character-open.webp", "guide-character-closed.webp", "guide-arch.webp",
    "report-paper-top.webp", "report-paper-left.webp", "report-paper-right.webp",
    "report-paper-bottom.webp", "guide-foreground-top.webp", "swipe-up-hint-v2.png",
  ]);
  await page.route("**/design/guide/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    if (delayed.has(name)) await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const root = page.locator(".brand-guide");
  const fallback = page.locator(".brand-guide-portrait-scene .brand-guide-fallback");
  await expect(root).toHaveClass(/is-loading/);
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveCSS("opacity", "1");
  await page.screenshot({ path: `${evidenceRoot}/375x812-cold-cache-fallback.png` });
  await waitForGuide(page);
  await expect(root).toHaveClass(/is-ready/);
  await expect(page.locator(".brand-guide-live-stage")).toHaveCSS("opacity", "1");
  await expect(fallback).toHaveCSS("opacity", "0");
});

test("one failed live layer leaves the complete fallback usable", async ({ page }) => {
  await page.route("**/design/guide/guide-character-open.webp", (route) => route.abort());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go", { waitUntil: "domcontentloaded" });
  const root = page.locator(".brand-guide");
  await expect(root).toHaveClass(/is-failed/, { timeout: 10_000 });
  await expect(page.locator(".brand-guide-portrait-scene .brand-guide-fallback")).toBeVisible();
  await expect(page.locator(".brand-guide-portrait-scene .brand-guide-fallback")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 10_000 });
});

for (const viewport of [{ width: 320, height: 568 }, { width: 440, height: 820 }]) {
  test(`compact handoff snapshot stays aligned at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/go", { waitUntil: "domcontentloaded" });
    await waitForGuide(page);
    await page.getByRole("button", { name: "进入档案" }).click({ noWaitAfter: true });
    const snapshot = page.locator("#h5-guide-route-buffer-host .h5-guide-route-snapshot.is-compact");
    await expect(snapshot).toBeVisible();
    const box = await snapshot.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x).toBeCloseTo(0, 0);
    expect(box?.width).toBeCloseTo(viewport.width, 0);
    expect(box?.height).toBeCloseTo(viewport.height, 0);
    await page.screenshot({ path: `${evidenceRoot}/${viewport.width}x${viewport.height}-handoff.png` });
  });
}
