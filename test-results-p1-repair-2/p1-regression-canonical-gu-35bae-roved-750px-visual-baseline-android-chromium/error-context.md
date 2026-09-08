# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p1-regression.spec.ts >> canonical guide still matches the approved 750px visual baseline
- Location: tests\e2e\p1-regression.spec.ts:533:5

# Error details

```
Error: expect(locator).toHaveScreenshot(expected) failed

Locator: locator('.brand-guide-stage')
  41751 pixels (ratio 0.04 of all image pixels) are different.

  Snapshot: source-guide-normalized-750x1624.png

Call log:
  - Expect "toHaveScreenshot(source-guide-normalized-750x1624.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - waiting for locator('.brand-guide-stage')
    - locator resolved to <section aria-label="品牌引导页" data-swipe-state="ready" data-blink-hold-ms="200" class="brand-guide-stage" data-load-state="reduced" data-blink-start-ms="350" data-paper-start-ms="420" data-gesture-state="ready" data-swipe-ready-ms="2140" data-swipe-distance-px="24" data-blink-duration-ms="270" data-animation-state="paused" data-paper-duration-ms="1500" data-destination-state="ready" data-swipe-commit-progress="0.12">…</section>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - 41751 pixels (ratio 0.04 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - waiting for locator('.brand-guide-stage')
    - locator resolved to <section aria-label="品牌引导页" data-swipe-state="ready" data-blink-hold-ms="200" class="brand-guide-stage" data-load-state="reduced" data-blink-start-ms="350" data-paper-start-ms="420" data-gesture-state="ready" data-swipe-ready-ms="2140" data-swipe-distance-px="24" data-blink-duration-ms="270" data-animation-state="paused" data-paper-duration-ms="1500" data-destination-state="ready" data-swipe-commit-progress="0.12">…</section>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - captured a stable screenshot
  - 41751 pixels (ratio 0.04 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - region "品牌引导页" [ref=e4]:
      - generic [ref=e6]:
        - img "诚实纽雀品牌引导"
      - heading "Honest Nutri 品牌引导" [level=1] [ref=e7]
      - generic [ref=e8]: 向上滑动，或点击下方提示进入档案
      - button "进入档案" [ref=e9] [cursor=pointer]
  - alert [ref=e10]
```

# Test source

```ts
  441 |     const resources = watchCriticalResources(page);
  442 |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
  443 |     await page.goto("/go", { waitUntil: "domcontentloaded" });
  444 | 
  445 |     const root = page.locator(".brand-guide");
  446 |     const stage = page.locator(".brand-guide-stage");
  447 |     const destination = page.locator(".brand-guide-destination-preview");
  448 |     await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15_000 });
  449 |     await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  450 |     await expectDecodedImages(root, ".brand-guide-artwork img, .brand-guide-destination-preview img", 3);
  451 |     const guideFrame = await expectFrameWidth(stage.locator(".brand-guide-artwork"), viewport.width);
  452 |     const destinationFrame = await expectFrameWidth(destination.locator(".brand-guide-destination-content"), viewport.width);
  453 |     expect(destinationFrame.width).toBeCloseTo(guideFrame.width, 0);
  454 |     expect(destinationFrame.x).toBeCloseTo(guideFrame.x, 0);
  455 |     await expectNoHorizontalOverflow(page, viewport.width);
  456 |     await expectGuideSubjectOccupancy(page);
  457 | 
  458 |     const states: TransitionMetric[] = [];
  459 |     const initial = await readTransitionMetric(page);
  460 |     states.push(initial);
  461 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-000`);
  462 | 
  463 |     const startX = Math.round(viewport.width / 2);
  464 |     const startY = viewport.height - 8;
  465 |     // Drive React's touch handlers directly. This works in Chromium and
  466 |     // WebKit without binding the contract to one device UA or CDP-only input.
  467 |     await dispatchSingleTouch(root, "touchstart", startX, startY);
  468 |     for (const progress of transitionProgress.slice(1)) {
  469 |       const expectedProgress = progress === 1 ? startY / viewport.height : progress;
  470 |       const targetY = Math.max(0, startY - viewport.height * progress);
  471 |       await dispatchSingleTouch(root, "touchmove", startX, targetY);
  472 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeGreaterThanOrEqual(expectedProgress - 0.035);
  473 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeLessThanOrEqual(expectedProgress + 0.035);
  474 |       await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  475 |       const state = await readTransitionMetric(page);
  476 |       states.push(state);
  477 |       await captureEvidence(page, testInfo, `${viewport.name}-transition-${String(progress * 100).padStart(3, "0")}`);
  478 |     }
  479 | 
  480 |     expect(states).toHaveLength(5);
  481 |     expect(states[0].guideOpacity).toBeGreaterThanOrEqual(0.94);
  482 |     expect(states.at(-1)?.destinationOpacity).toBeGreaterThanOrEqual(0.94);
  483 |     for (let index = 0; index < states.length; index += 1) {
  484 |       const state = states[index];
  485 |       expect(state.blurredRoots, `full-frame blur at ${transitionProgress[index] * 100}%`).toEqual([]);
  486 |       expect(state.coverage, `painted coverage at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.78);
  487 |       if (index > 0) {
  488 |         expect(state.guideOpacity).toBeLessThanOrEqual(states[index - 1].guideOpacity + 0.03);
  489 |         expect(state.destinationOpacity).toBeGreaterThanOrEqual(states[index - 1].destinationOpacity - 0.03);
  490 |       }
  491 |       if (index > 0 && index < states.length - 1) {
  492 |         expect(state.guideOpacity).toBeGreaterThan(0.06);
  493 |         expect(state.destinationOpacity).toBeGreaterThan(0.16);
  494 |         expect(state.overlap, `spatial overlap at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.12);
  495 |       }
  496 |     }
  497 | 
  498 |     await startHandoffCoverageProbe(page);
  499 |     await dispatchSingleTouch(root, "touchend", startX, 0);
  500 |     const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  501 |     await expect(routeBuffer).toBeVisible({ timeout: 5_000 });
  502 |     await expect(routeBuffer).toHaveAttribute("data-guide-profile", await root.getAttribute("data-guide-profile") ?? "portrait-standard");
  503 |     await expect(routeBuffer).toHaveAttribute("data-commit-state", /^(prepared|committing)$/);
  504 |     await expectDecodedImages(routeBuffer, "img", 2);
  505 |     await expect(routeBuffer.locator(".h5-guide-route-destination-image")).toHaveAttribute("data-decode-state", "ready");
  506 |     const routeDestinationBox = await routeBuffer.locator(".h5-guide-route-destination-image").boundingBox();
  507 |     expect(routeDestinationBox).not.toBeNull();
  508 |     if (!routeDestinationBox) throw new Error("route destination frame has no box");
  509 |     expect(routeDestinationBox.width).toBeCloseTo(guideFrame.width, 0);
  510 |     expect(routeDestinationBox.x).toBeCloseTo(guideFrame.x, 0);
  511 | 
  512 |     await page.waitForURL(/\/reports$/, { timeout: 15_000 });
  513 |     const archive = page.locator(".reports-archive-final");
  514 |     await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  515 |     await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  516 |     await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  517 |     await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  518 |     const archiveBox = await expectFrameWidth(archive, viewport.width);
  519 |     expect(archiveBox.width).toBeCloseTo(guideFrame.width, 0);
  520 |     expect(archiveBox.x).toBeCloseTo(guideFrame.x, 0);
  521 |     await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  522 |     const handoffSamples = await stopHandoffCoverageProbe(page);
  523 |     expect(handoffSamples.length).toBeGreaterThan(4);
  524 |     const emptySamples = handoffSamples.filter((sample) => sample.coverage < 0.72);
  525 |     expect(emptySamples, `handoff samples with insufficient painted content: ${JSON.stringify(emptySamples.slice(0, 5))}`).toEqual([]);
  526 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-complete`);
  527 |     await expectNoHorizontalOverflow(page, viewport.width);
  528 |     resources.stop();
  529 |     expect(resources.failures).toEqual([]);
  530 |   });
  531 | }
  532 | 
  533 | test("canonical guide still matches the approved 750px visual baseline", async ({ page }, testInfo) => {
  534 |   test.skip(testInfo.project.name !== "android-chromium", "one engine owns the pixel baseline; both engines run geometry gates");
  535 |   await page.emulateMedia({ reducedMotion: "reduce" });
  536 |   await page.setViewportSize({ width: 750, height: 1624 });
  537 |   await page.goto("/go", { waitUntil: "domcontentloaded" });
  538 |   const stage = page.locator(".brand-guide-stage");
  539 |   await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  540 |   await expectDecodedImages(stage, "img", 1);
> 541 |   await expect(stage).toHaveScreenshot("source-guide-normalized-750x1624.png", {
      |                       ^ Error: expect(locator).toHaveScreenshot(expected) failed
  542 |     animations: "disabled",
  543 |     scale: "css",
  544 |     maxDiffPixelRatio: 0.025,
  545 |   });
  546 | });
  547 | 
  548 | test("archive fallback survives delayed decode, failed assets, and a clean retry", async ({ page }) => {
  549 |   const blockedAsset = /\/module-1-title(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  550 |   let releaseAsset!: () => void;
  551 |   const assetReleased = new Promise<void>((resolve) => { releaseAsset = resolve; });
  552 |   await page.setViewportSize({ width: 375, height: 812 });
  553 |   await page.route(blockedAsset, async (route) => {
  554 |     await assetReleased;
  555 |     await route.continue();
  556 |   });
  557 |   await page.goto("/reports", { waitUntil: "domcontentloaded" });
  558 |   const archive = page.locator(".reports-archive-final");
  559 |   const fallback = page.locator(".reports-archive-reference-fallback");
  560 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false");
  561 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  562 |   await expect(fallback).toBeVisible();
  563 |   await page.waitForTimeout(350);
  564 |   await expect(fallback).toBeVisible();
  565 |   releaseAsset();
  566 |   await page.unrouteAll({ behavior: "wait" });
  567 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  568 |   await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  569 |   await expect(fallback).toBeHidden();
  570 |   await expect(fallback).toHaveAttribute("data-fallback-image", "released");
  571 |   await expect(fallback.locator("img")).toHaveCount(0);
  572 | 
  573 |   const failedAsset = /\/module-1-badge(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  574 |   const expectedFailure = (request: Request) => failedAsset.test(request.url());
  575 |   const resources = watchCriticalResources(page, expectedFailure);
  576 |   await page.route(failedAsset, (route) => route.abort("failed"));
  577 |   await page.reload({ waitUntil: "domcontentloaded" });
  578 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false", { timeout: 15_000 });
  579 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "true", { timeout: 15_000 });
  580 |   await expect(fallback).toBeVisible();
  581 |   const fallbackBox = await fallback.boundingBox();
  582 |   const archiveBox = await archive.boundingBox();
  583 |   expect(fallbackBox).not.toBeNull();
  584 |   expect(archiveBox).not.toBeNull();
  585 |   if (!fallbackBox || !archiveBox) throw new Error("archive fallback has no layout box");
  586 |   expect(fallbackBox.width).toBeGreaterThanOrEqual(archiveBox.width * 0.98);
  587 | 
  588 |   await page.unroute(failedAsset);
  589 |   await page.reload({ waitUntil: "domcontentloaded" });
  590 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  591 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  592 |   await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  593 |   resources.stop();
  594 |   expect(resources.failures).toEqual([]);
  595 | });
  596 | 
  597 | test("cold and warm production-cache journeys decode every requested visual asset", async ({ page, request }) => {
  598 |   await page.setViewportSize({ width: 375, height: 812 });
  599 |   const resources = watchCriticalResources(page);
  600 |   const observedAssetUrls = new Set<string>();
  601 |   const warmCacheEvidence: Array<{ label: string; name: string; transferSize: number; encodedBodySize: number; deliveryType: string }> = [];
  602 |   const rememberRenderedAssets = async () => {
  603 |     const current = await page.locator("img").evaluateAll((images) => images
  604 |       .map((image) => (image as HTMLImageElement).currentSrc)
  605 |       .filter(Boolean));
  606 |     current.forEach((url) => observedAssetUrls.add(url));
  607 |   };
  608 |   const rememberWarmCacheEvidence = async (label: string) => {
  609 |     const entries = await page.evaluate(() => (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
  610 |       .filter((entry) => new URL(entry.name).pathname.startsWith("/design/"))
  611 |       .map((entry) => ({
  612 |         name: entry.name,
  613 |         transferSize: entry.transferSize,
  614 |         encodedBodySize: entry.encodedBodySize,
  615 |         deliveryType: (entry as PerformanceResourceTiming & { deliveryType?: string }).deliveryType ?? "",
  616 |       })));
  617 |     expect(entries.length, `${label} must expose design-asset resource timing`).toBeGreaterThan(0);
  618 |     const cacheHits = entries.filter((entry) => entry.deliveryType === "cache" || entry.transferSize === 0);
  619 |     expect(cacheHits.length, `${label} must include a browser-cache hit: ${JSON.stringify(entries)}`).toBeGreaterThan(0);
  620 |     warmCacheEvidence.push(...entries.map((entry) => ({ label, ...entry })));
  621 |   };
  622 | 
  623 |   await test.step("cold cache", async () => {
  624 |     await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" });
  625 |     await page.goto("/go", { waitUntil: "domcontentloaded" });
  626 |     await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  627 |     await expectDecodedImages(page.locator(".brand-guide"), "img", 3);
  628 |     await rememberRenderedAssets();
  629 |     await page.goto("/reports", { waitUntil: "domcontentloaded" });
  630 |     const archive = page.locator(".reports-archive-final");
  631 |     await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  632 |     await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  633 |     await rememberRenderedAssets();
  634 |   });
  635 | 
  636 |   await test.step("warm cache", async () => {
  637 |     await page.setExtraHTTPHeaders({});
  638 |     await page.goto("/go", { waitUntil: "domcontentloaded" });
  639 |     await expect(page.locator(".brand-guide-stage")).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  640 |     await expectDecodedImages(page.locator(".brand-guide"), "img", 3);
  641 |     await rememberWarmCacheEvidence("warm guide navigation");
```