import { expect, test, type Page } from "@playwright/test";

const hierarchyStateKey = "__honestNutriH5Hierarchy";

async function historyLength(page: Page) {
  return page.evaluate(() => window.history.length);
}

async function hierarchyParent(page: Page) {
  return page.evaluate((key) => window.history.state?.[key]?.parentHref ?? null, hierarchyStateKey);
}

async function rightSwipe(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    const touch = (clientX: number, clientY: number) => ({ identifier: 1, target: element, clientX, clientY });
    const dispatch = (type: string, touches: ReturnType<typeof touch>[], changedTouches: ReturnType<typeof touch>[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        touches: { value: touches },
        changedTouches: { value: changedTouches },
      });
      element.dispatchEvent(event);
    };
    const start = touch(20, 200);
    const end = touch(120, 206);
    dispatch("touchstart", [start], [start]);
    dispatch("touchend", [], [end]);
  });
}

async function waitForArchive(page: Page) {
  await expect(page.locator(".reports-archive-final")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#h5-guide-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
}

async function waitForCategory(page: Page) {
  await expect(page.locator(".category-page-final")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#h5-category-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
}

test("guide is replaced while category and report follow the platform Back hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go?hierarchy-sentinel=1");
  await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 10_000 });

  const guideLength = await page.evaluate(() => {
    window.history.pushState({ ...window.history.state, hierarchyTest: true }, "", "/go");
    return window.history.length;
  });

  await page.getByRole("button", { name: "进入档案" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  expect(await historyLength(page)).toBe(guideLength);
  await waitForArchive(page);

  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  expect(await historyLength(page)).toBe(guideLength + 1);
  await expect.poll(() => hierarchyParent(page)).toBe("/reports");
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);

  const firstReport = page.locator(".category-card-hotspot").first();
  await expect(firstReport).toBeEnabled({ timeout: 15_000 });
  await firstReport.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);
  expect(await historyLength(page)).toBe(guideLength + 2);
  await expect.poll(() => hierarchyParent(page)).toBe("/reports/inspection-projects");
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  await waitForArchive(page);

  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  const reportUrl = page.url();
  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  expect(page.url()).not.toBe(reportUrl);

  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await rightSwipe(page, ".category-page-final");
  await expect(page).toHaveURL(/\/reports$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/go\?hierarchy-sentinel=1$/);
});

test("a direct report link right-swipes to its canonical parent without reopening the report", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go?direct-origin=1");
  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.locator(".report-page-final")).toBeVisible({ timeout: 15_000 });
  expect(await hierarchyParent(page)).toBeNull();

  const reportUrl = page.url();
  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/go\?direct-origin=1$/);
  expect(page.url()).not.toBe(reportUrl);
});

test("the reduced-motion fallback keeps every archive layer painted while a category route commits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/reports");
  await waitForArchive(page);

  const review = page.locator('.archive-category-hotspot[data-slug="review-assurance"]');
  await expect(review).toBeEnabled({ timeout: 15_000 });
  await review.scrollIntoViewIfNeeded();
  await review.evaluate((element) => (element as HTMLButtonElement).click());

  const clone = page.locator("#h5-category-route-buffer-host .reports-archive-final.is-category-route-buffer-clone");
  await expect(clone).toHaveCount(1);
  const frozenFrame = await clone.evaluate((element) => {
    const artwork = element.querySelector<HTMLElement>(".reports-archive-art");
    const moduleLayers = [...element.querySelectorAll<HTMLElement>("[data-archive-module]")];
    const referenceFallback = element.querySelector<HTMLElement>(".reports-archive-reference-fallback");
    const referenceFallbackImage = referenceFallback?.querySelector<HTMLImageElement>(".reports-archive-reference-fallback-image") ?? null;
    const fallbackStyle = referenceFallback ? getComputedStyle(referenceFallback) : null;
    return {
      rootAnimation: getComputedStyle(element).animationName,
      rootOpacity: getComputedStyle(element).opacity,
      artworkAnimation: artwork ? getComputedStyle(artwork).animationName : null,
      artworkOpacity: artwork ? getComputedStyle(artwork).opacity : null,
      moduleSlugs: [...new Set(moduleLayers.map((layer) => layer.dataset.archiveModule))],
      referenceFallbackVisible: Boolean(referenceFallbackImage?.complete && referenceFallbackImage.naturalWidth > 0
        && fallbackStyle?.display !== "none" && fallbackStyle?.visibility !== "hidden" && Number(fallbackStyle?.opacity) > 0),
      hiddenModuleLayers: moduleLayers.filter((layer) => {
        const style = getComputedStyle(layer);
        return style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0;
      }).length,
    };
  });
  expect(frozenFrame.rootAnimation).toBe("none");
  expect(frozenFrame.rootOpacity).toBe("1");
  expect(frozenFrame.artworkAnimation).toBe("none");
  expect(frozenFrame.artworkOpacity).toBe("1");
  const hasEveryModuleLayer = ["inspection-projects", "review-assurance", "production-traceability"]
    .every((slug) => frozenFrame.moduleSlugs.includes(slug));
  expect(hasEveryModuleLayer || frozenFrame.referenceFallbackVisible).toBe(true);
  expect(frozenFrame.hiddenModuleLayers).toBe(0);

  await expect(page).toHaveURL(/\/reports\/review-assurance$/);
  await waitForCategory(page);
});

test("a native category snapshot does not replay the generic page entrance after release", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/reports");
  await waitForArchive(page);
  test.skip(!(await page.evaluate(() => typeof document.startViewTransition === "function")), "View Transitions API is unavailable");

  const inspection = page.locator('.archive-category-hotspot[data-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-category-native-transition"))).toBeNull();

  const settledFrame = await page.locator(".category-page-final").evaluate((element) => ({
    entry: element.getAttribute("data-route-entry"),
    animation: getComputedStyle(element).animationName,
    opacity: getComputedStyle(element).opacity,
    transform: getComputedStyle(element).transform,
  }));
  expect(settledFrame.entry).toBe("reports-archive-native");
  expect(settledFrame.animation).toBe("none");
  expect(settledFrame.opacity).toBe("1");
  expect(settledFrame.transform).toBe("none");
});

test("a slow category asset hands the pressed archive to the painted loading page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let releaseAsset!: () => void;
  const heldAsset = new Promise<void>((resolve) => { releaseAsset = resolve; });
  await page.route("**/inspection-folder-layer.runtime.webp", async (route) => {
    await heldAsset;
    await route.continue();
  });
  await page.goto("/reports");
  await waitForArchive(page);

  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);

  const root = page.locator("html");
  const loading = page.locator(".runtime-loading-layer:not(.is-leaving)");
  await expect(root).toHaveAttribute("data-category-loading-feedback", /category-.+/, { timeout: 5_000 });
  await expect(loading).toBeVisible();
  await expect(loading.locator(".guide-loading-buffer-poster")).toHaveJSProperty("complete", true);

  releaseAsset();
  await waitForCategory(page);
  await expect(root).not.toHaveAttribute("data-category-loading-feedback", /.+/);
  await expect(page.locator(".runtime-loading-layer")).toHaveCount(0, { timeout: 5_000 });
});

for (const categorySlug of ["inspection-projects", "review-assurance"] as const) {
test(`a slow ${categorySlug} report route keeps immediate card feedback and hands the loading page to an opaque target`, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let releaseReportRoute!: () => void;
  let reportRouteReleased = false;
  let heldReportRequests = 0;
  const heldReportRoute = new Promise<void>((resolve) => {
    releaseReportRoute = () => {
      if (reportRouteReleased) return;
      reportRouteReleased = true;
      resolve();
    };
  });

  await page.route("**/reports/**/items/**/reports**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isReportRsc = url.searchParams.has("_rsc") || request.headers().rsc === "1";
    if (!isReportRsc) {
      await route.continue();
      return;
    }
    heldReportRequests += 1;
    await heldReportRoute;
    await route.continue();
  });

  try {
    await page.goto(`/reports/${categorySlug}`);
    await waitForCategory(page);
    await expect(page.locator(".runtime-loading-layer")).toHaveCount(0, { timeout: 15_000 });

    const firstReport = page.locator('.category-card-hotspot[data-index="0"]');
    await expect(firstReport).toBeEnabled({ timeout: 15_000 });
    await firstReport.scrollIntoViewIfNeeded();
    const cardBox = await firstReport.boundingBox();
    if (!cardBox) throw new Error("first report card has no layout box");

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await expect.poll(() => firstReport.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe("rgba(0, 0, 0, 0)");
    await page.mouse.up();

    await expect.poll(() => heldReportRequests, { timeout: 5_000 }).toBeGreaterThan(0);
    const loading = page.locator(".runtime-loading-layer:not(.is-leaving)");
    const loadingPoster = loading.locator(".guide-loading-buffer-poster");
    await expect(loading).toBeVisible({ timeout: 5_000 });
    await expect.poll(() => loadingPoster.evaluate(async (image) => {
      if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth <= 0) return false;
      await image.decode?.();
      return true;
    })).toBe(true);
    const loadingCoverage = await loading.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        opacity: Number(style.opacity),
        visibility: style.visibility,
      };
    });
    expect(loadingCoverage.left).toBeLessThanOrEqual(0.5);
    expect(loadingCoverage.top).toBeLessThanOrEqual(0.5);
    expect(loadingCoverage.right).toBeGreaterThanOrEqual(374.5);
    expect(loadingCoverage.bottom).toBeGreaterThanOrEqual(811.5);
    expect(loadingCoverage.opacity).toBe(1);
    expect(loadingCoverage.visibility).toBe("visible");

    await page.evaluate(() => {
      const probeWindow = window as typeof window & {
        __reportRouteHandoffActive?: boolean;
        __reportRouteHandoffSamples?: Array<{
          loadingVisible: boolean;
          targetAnimation: string | null;
          targetOpacity: number | null;
        }>;
      };
      probeWindow.__reportRouteHandoffActive = true;
      probeWindow.__reportRouteHandoffSamples = [];
      const isVisible = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && rect.width >= window.innerWidth - 1 && rect.height >= window.innerHeight - 1;
      };
      const sample = () => {
        const target = document.querySelector<HTMLElement>(".report-page-final");
        const targetStyle = target ? getComputedStyle(target) : null;
        probeWindow.__reportRouteHandoffSamples?.push({
          loadingVisible: isVisible(document.querySelector(".runtime-loading-layer")),
          targetAnimation: targetStyle?.animationName ?? null,
          targetOpacity: targetStyle ? Number(targetStyle.opacity) : null,
        });
        if (probeWindow.__reportRouteHandoffActive) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    releaseReportRoute();
    await expect(page).toHaveURL(new RegExp(`/reports/${categorySlug}/items/[^/]+/reports$`));
    const reportPage = page.locator(".report-page-final");
    await expect(reportPage).toBeVisible({ timeout: 15_000 });
    await expect(reportPage).toHaveCSS("opacity", "1");
    await expect(page.locator(".runtime-loading-layer")).toHaveCount(0, { timeout: 5_000 });
    const handoffSamples = await page.evaluate(() => {
      const probeWindow = window as typeof window & {
        __reportRouteHandoffActive?: boolean;
        __reportRouteHandoffSamples?: Array<{
          loadingVisible: boolean;
          targetAnimation: string | null;
          targetOpacity: number | null;
        }>;
      };
      probeWindow.__reportRouteHandoffActive = false;
      return probeWindow.__reportRouteHandoffSamples ?? [];
    });
    const firstTargetFrame = handoffSamples.find((sample) => sample.targetOpacity !== null);
    expect(firstTargetFrame, "the handoff probe must observe the report target's first frame").toBeDefined();
    expect(firstTargetFrame?.targetOpacity).toBe(1);
    expect(firstTargetFrame?.targetAnimation).not.toBe("h5-page-enter");
    expect(handoffSamples.some((sample) => sample.loadingVisible)).toBe(true);
    expect(handoffSamples.filter((sample) => sample.targetOpacity === null).every((sample) => sample.loadingVisible),
      "the painted loading page must continuously cover every pre-target frame").toBe(true);
  } finally {
    releaseReportRoute();
  }
});
}

test("returning from a report restores the category reading position", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/reports");
  await waitForArchive(page);
  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);

  const category = page.locator(".category-page-final");
  const savedScroll = await category.evaluate((element) => {
    element.scrollTop = Math.min(90, element.scrollHeight - element.clientHeight);
    return element.scrollTop;
  });
  expect(savedScroll).toBeGreaterThan(0);
  await page.locator(".category-card-hotspot").first().evaluate((element) => (element as HTMLElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await expect.poll(() => category.evaluate((element) => element.scrollTop)).toBeCloseTo(savedScroll, 0);

  const swipeSavedScroll = await category.evaluate((element) => {
    element.scrollTop = Math.min(44, element.scrollHeight - element.clientHeight);
    return element.scrollTop;
  });
  expect(swipeSavedScroll).toBeGreaterThan(0);
  await page.locator(".category-card-hotspot").first().evaluate((element) => (element as HTMLElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await expect.poll(() => category.evaluate((element) => element.scrollTop)).toBeCloseTo(swipeSavedScroll, 0);
});
