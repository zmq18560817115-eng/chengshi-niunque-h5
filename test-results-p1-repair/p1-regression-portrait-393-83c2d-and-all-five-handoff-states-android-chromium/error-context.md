# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p1-regression.spec.ts >> portrait-393x852 preserves composition and all five handoff states
- Location: tests\e2e\p1-regression.spec.ts:411:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "destination": "decoded",
-   "source": "decoded",
+   "destination": null,
+   "source": null,
  }
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main "诚实透明档案" [ref=e2]:
    - generic [ref=e3]:
      - img "诚实透明档案" [ref=e4]
      - navigation "档案分类":
        - button "点击进入检测项目" [ref=e6] [cursor=pointer]
        - button "检测项目人物，点击进入检测项目" [ref=e8] [cursor=pointer]:
          - generic [ref=e9]: 检测项目人物
        - button "检测项目，3项档案" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: 检测项目11
        - button "复核保障，3项档案" [ref=e12] [cursor=pointer]:
          - generic [ref=e13]: 复核保障
        - button "生产溯源，2项档案" [ref=e14] [cursor=pointer]:
          - generic [ref=e15]: 生产溯源
  - alert [ref=e16]
```

# Test source

```ts
  377 |       let weightedCoverage = 0;
  378 |       for (const element of candidates) {
  379 |         if (element instanceof HTMLImageElement
  380 |           && (!element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0)) continue;
  381 |         const opacity = effectiveOpacity(element);
  382 |         const area = visibleAreaInViewport(element);
  383 |         if (opacity <= 0 || area <= 0) continue;
  384 |         active.push(element.className.toString());
  385 |         weightedCoverage += area * opacity;
  386 |       }
  387 |       probe.samples.push({
  388 |         at: performance.now(),
  389 |         coverage: Math.min(1, weightedCoverage / viewportArea()),
  390 |         active,
  391 |         path: window.location.pathname,
  392 |         routeState: document.documentElement.getAttribute("data-guide-route-entry"),
  393 |         bufferCount: document.querySelectorAll("#h5-guide-route-buffer-host > .h5-guide-route-buffer").length,
  394 |       });
  395 |       requestAnimationFrame(sample);
  396 |     };
  397 |     requestAnimationFrame(sample);
  398 |   });
  399 | }
  400 | 
  401 | async function stopHandoffCoverageProbe(page: Page) {
  402 |   return page.evaluate(() => {
  403 |     const probe = window.__p1HandoffProbe;
  404 |     if (!probe) return [];
  405 |     probe.running = false;
  406 |     return probe.samples;
  407 |   });
  408 | }
  409 | 
  410 | for (const viewport of targetViewports) {
  411 |   test(`${viewport.name} preserves composition and all five handoff states`, async ({ page }, testInfo) => {
  412 |     const resources = watchCriticalResources(page);
  413 |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
  414 |     await page.goto("/go", { waitUntil: "domcontentloaded" });
  415 | 
  416 |     const root = page.locator(".brand-guide");
  417 |     const stage = page.locator(".brand-guide-stage");
  418 |     const destination = page.locator(".brand-guide-destination-preview");
  419 |     await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15_000 });
  420 |     await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  421 |     await expectDecodedImages(root, ".brand-guide-artwork img, .brand-guide-destination-preview img", 3);
  422 |     const guideFrame = await expectFrameWidth(stage.locator(".brand-guide-artwork"), viewport.width);
  423 |     const destinationFrame = await expectFrameWidth(destination.locator(".brand-guide-destination-content"), viewport.width);
  424 |     expect(destinationFrame.width).toBeCloseTo(guideFrame.width, 0);
  425 |     expect(destinationFrame.x).toBeCloseTo(guideFrame.x, 0);
  426 |     await expectNoHorizontalOverflow(page, viewport.width);
  427 |     await expectGuideSubjectOccupancy(page);
  428 | 
  429 |     const states: TransitionMetric[] = [];
  430 |     const initial = await readTransitionMetric(page);
  431 |     states.push(initial);
  432 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-000`);
  433 | 
  434 |     const startX = Math.round(viewport.width / 2);
  435 |     const startY = viewport.height - 8;
  436 |     // Drive React's touch handlers directly. This works in Chromium and
  437 |     // WebKit without binding the contract to one device UA or CDP-only input.
  438 |     await dispatchSingleTouch(root, "touchstart", startX, startY);
  439 |     for (const progress of transitionProgress.slice(1)) {
  440 |       const expectedProgress = progress === 1 ? startY / viewport.height : progress;
  441 |       const targetY = Math.max(0, startY - viewport.height * progress);
  442 |       await dispatchSingleTouch(root, "touchmove", startX, targetY);
  443 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeGreaterThanOrEqual(expectedProgress - 0.035);
  444 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeLessThanOrEqual(expectedProgress + 0.035);
  445 |       await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  446 |       const state = await readTransitionMetric(page);
  447 |       states.push(state);
  448 |       await captureEvidence(page, testInfo, `${viewport.name}-transition-${String(progress * 100).padStart(3, "0")}`);
  449 |     }
  450 | 
  451 |     expect(states).toHaveLength(5);
  452 |     expect(states[0].guideOpacity).toBeGreaterThanOrEqual(0.94);
  453 |     expect(states.at(-1)?.destinationOpacity).toBeGreaterThanOrEqual(0.94);
  454 |     for (let index = 0; index < states.length; index += 1) {
  455 |       const state = states[index];
  456 |       expect(state.blurredRoots, `full-frame blur at ${transitionProgress[index] * 100}%`).toEqual([]);
  457 |       expect(state.coverage, `painted coverage at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.78);
  458 |       if (index > 0) {
  459 |         expect(state.guideOpacity).toBeLessThanOrEqual(states[index - 1].guideOpacity + 0.03);
  460 |         expect(state.destinationOpacity).toBeGreaterThanOrEqual(states[index - 1].destinationOpacity - 0.03);
  461 |       }
  462 |       if (index > 0 && index < states.length - 1) {
  463 |         expect(state.guideOpacity).toBeGreaterThan(0.06);
  464 |         expect(state.destinationOpacity).toBeGreaterThan(0.16);
  465 |         expect(state.overlap, `spatial overlap at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.12);
  466 |       }
  467 |     }
  468 | 
  469 |     await startHandoffCoverageProbe(page);
  470 |     await dispatchSingleTouch(root, "touchend", startX, 0);
  471 |     const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  472 |     await expect(routeBuffer).toBeAttached({ timeout: 5_000 });
  473 |     const routeBufferState = await routeBuffer.evaluate((element) => ({
  474 |       source: element.getAttribute("data-source-state"),
  475 |       destination: element.getAttribute("data-destination-state"),
  476 |     }));
> 477 |     expect(routeBufferState).toEqual({ source: "decoded", destination: "decoded" });
      |                              ^ Error: expect(received).toEqual(expected) // deep equality
  478 |     const routeDestinationBox = await routeBuffer.locator(".h5-guide-route-destination-image").boundingBox();
  479 |     expect(routeDestinationBox).not.toBeNull();
  480 |     if (!routeDestinationBox) throw new Error("route destination frame has no box");
  481 |     expect(routeDestinationBox.width).toBeCloseTo(guideFrame.width, 0);
  482 |     expect(routeDestinationBox.x).toBeCloseTo(guideFrame.x, 0);
  483 | 
  484 |     await page.waitForURL(/\/reports$/, { timeout: 15_000 });
  485 |     const archive = page.locator(".reports-archive-final");
  486 |     await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  487 |     await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  488 |     await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  489 |     await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  490 |     const archiveBox = await expectFrameWidth(archive, viewport.width);
  491 |     expect(archiveBox.width).toBeCloseTo(guideFrame.width, 0);
  492 |     expect(archiveBox.x).toBeCloseTo(guideFrame.x, 0);
  493 |     await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  494 |     const handoffSamples = await stopHandoffCoverageProbe(page);
  495 |     expect(handoffSamples.length).toBeGreaterThan(4);
  496 |     const emptySamples = handoffSamples.filter((sample) => sample.coverage < 0.72);
  497 |     expect(emptySamples, `handoff samples with insufficient painted content: ${JSON.stringify(emptySamples.slice(0, 5))}`).toEqual([]);
  498 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-complete`);
  499 |     await expectNoHorizontalOverflow(page, viewport.width);
  500 |     resources.stop();
  501 |     expect(resources.failures).toEqual([]);
  502 |   });
  503 | }
  504 | 
  505 | test("canonical guide still matches the approved 750px visual baseline", async ({ page }, testInfo) => {
  506 |   test.skip(testInfo.project.name !== "android-chromium", "one engine owns the pixel baseline; both engines run geometry gates");
  507 |   await page.emulateMedia({ reducedMotion: "reduce" });
  508 |   await page.setViewportSize({ width: 750, height: 1624 });
  509 |   await page.goto("/go", { waitUntil: "domcontentloaded" });
  510 |   const stage = page.locator(".brand-guide-stage");
  511 |   await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  512 |   await expectDecodedImages(stage, "img", 2);
  513 |   await expect(stage).toHaveScreenshot("source-guide-normalized-750x1624.png", {
  514 |     animations: "disabled",
  515 |     scale: "css",
  516 |     maxDiffPixelRatio: 0.025,
  517 |   });
  518 | });
  519 | 
  520 | test("archive fallback survives delayed decode, failed assets, and a clean retry", async ({ page }) => {
  521 |   const blockedAsset = /\/module-1-title(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  522 |   let releaseAsset!: () => void;
  523 |   const assetReleased = new Promise<void>((resolve) => { releaseAsset = resolve; });
  524 |   await page.setViewportSize({ width: 375, height: 812 });
  525 |   await page.route(blockedAsset, async (route) => {
  526 |     await assetReleased;
  527 |     await route.continue();
  528 |   });
  529 |   await page.goto("/reports", { waitUntil: "domcontentloaded" });
  530 |   const archive = page.locator(".reports-archive-final");
  531 |   const fallback = page.locator(".reports-archive-reference-fallback");
  532 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false");
  533 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  534 |   await expect(fallback).toBeVisible();
  535 |   await page.waitForTimeout(350);
  536 |   await expect(fallback).toBeVisible();
  537 |   releaseAsset();
  538 |   await page.unrouteAll({ behavior: "wait" });
  539 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  540 |   await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  541 |   await expect(fallback).toBeHidden();
  542 |   await expect(fallback).toHaveAttribute("data-fallback-image", "released");
  543 |   await expect(fallback.locator("img")).toHaveCount(0);
  544 | 
  545 |   const failedAsset = /\/module-1-badge(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  546 |   const expectedFailure = (request: Request) => failedAsset.test(request.url());
  547 |   const resources = watchCriticalResources(page, expectedFailure);
  548 |   await page.route(failedAsset, (route) => route.abort("failed"));
  549 |   await page.reload({ waitUntil: "domcontentloaded" });
  550 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false", { timeout: 15_000 });
  551 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "true", { timeout: 15_000 });
  552 |   await expect(fallback).toBeVisible();
  553 |   const fallbackBox = await fallback.boundingBox();
  554 |   const archiveBox = await archive.boundingBox();
  555 |   expect(fallbackBox).not.toBeNull();
  556 |   expect(archiveBox).not.toBeNull();
  557 |   if (!fallbackBox || !archiveBox) throw new Error("archive fallback has no layout box");
  558 |   expect(fallbackBox.width).toBeGreaterThanOrEqual(archiveBox.width * 0.98);
  559 | 
  560 |   await page.unroute(failedAsset);
  561 |   await page.reload({ waitUntil: "domcontentloaded" });
  562 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  563 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  564 |   await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  565 |   resources.stop();
  566 |   expect(resources.failures).toEqual([]);
  567 | });
  568 | 
  569 | test("cold and warm production-cache journeys decode every requested visual asset", async ({ page, request }) => {
  570 |   await page.setViewportSize({ width: 375, height: 812 });
  571 |   const resources = watchCriticalResources(page);
  572 |   const observedAssetUrls = new Set<string>();
  573 |   const warmCacheEvidence: Array<{ label: string; name: string; transferSize: number; encodedBodySize: number; deliveryType: string }> = [];
  574 |   const rememberRenderedAssets = async () => {
  575 |     const current = await page.locator("img").evaluateAll((images) => images
  576 |       .map((image) => (image as HTMLImageElement).currentSrc)
  577 |       .filter(Boolean));
```