# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p1-regression.spec.ts >> portrait-440x820 preserves composition and all five handoff states
- Location: tests\e2e\p1-regression.spec.ts:527:7

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 410
Received: 196.79998779296875

Expected precision:    0
Expected difference: < 0.5
Received difference:   213.20001220703125
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main "诚实透明档案" [ref=e2]:
    - generic [ref=e3]:
      - img "诚实透明档案" [ref=e4]
      - navigation "档案分类":
        - button "点击进入检测项目" [disabled] [ref=e5]
        - button "检测项目人物，点击进入检测项目" [disabled] [ref=e7]:
          - generic [ref=e8]: 检测项目人物
        - button "检测项目，3项档案" [disabled] [ref=e9]:
          - generic [ref=e10]: 检测项目11
        - button "复核保障，3项档案" [disabled] [ref=e11]:
          - generic [ref=e12]: 复核保障
        - button "生产溯源，2项档案" [disabled] [ref=e13]:
          - generic [ref=e14]: 生产溯源
  - button "Open Next.js Dev Tools" [ref=e20] [cursor=pointer]
  - alert [ref=e24]
```

# Test source

```ts
  510 |       });
  511 |       requestAnimationFrame(sample);
  512 |     };
  513 |     requestAnimationFrame(sample);
  514 |   });
  515 | }
  516 | 
  517 | async function stopHandoffCoverageProbe(page: Page) {
  518 |   return page.evaluate(() => {
  519 |     const probe = window.__p1HandoffProbe;
  520 |     if (!probe) return [];
  521 |     probe.running = false;
  522 |     return probe.samples;
  523 |   });
  524 | }
  525 | 
  526 | for (const viewport of targetViewports) {
  527 |   test(`${viewport.name} preserves composition and all five handoff states`, async ({ page }, testInfo) => {
  528 |     const resources = watchCriticalResources(page);
  529 |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
  530 |     await page.goto("/go", { waitUntil: "domcontentloaded" });
  531 | 
  532 |     const root = page.locator(".brand-guide");
  533 |     const stage = page.locator(".brand-guide-stage");
  534 |     const destination = page.locator(".brand-guide-destination-preview");
  535 |     await expect(stage).toHaveAttribute("data-gesture-state", "ready", { timeout: 15_000 });
  536 |     await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  537 |     await expectDecodedImages(root, ".brand-guide-artwork img, .brand-guide-destination-preview img", 3);
  538 |     await expectLayeredGuideDestination(destination.locator(".brand-guide-destination-content"));
  539 |     const guideFrame = await expectFrameWidth(stage.locator(".brand-guide-artwork"), viewport.width);
  540 |     const destinationFrame = await expectFrameWidth(destination.locator(".brand-guide-destination-content"), viewport.width);
  541 |     expect(destinationFrame.width).toBeCloseTo(guideFrame.width, 0);
  542 |     expect(destinationFrame.x).toBeCloseTo(guideFrame.x, 0);
  543 |     await expectNoHorizontalOverflow(page, viewport.width);
  544 |     await expectGuideSubjectOccupancy(page);
  545 | 
  546 |     const states: TransitionMetric[] = [];
  547 |     const initial = await readTransitionMetric(page);
  548 |     states.push(initial);
  549 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-000`);
  550 | 
  551 |     const startX = Math.round(viewport.width / 2);
  552 |     const startY = viewport.height - 8;
  553 |     // Drive React's touch handlers directly. This works in Chromium and
  554 |     // WebKit without binding the contract to one device UA or CDP-only input.
  555 |     await dispatchSingleTouch(root, "touchstart", startX, startY);
  556 |     for (const progress of transitionProgress.slice(1)) {
  557 |       const expectedProgress = progress === 1 ? startY / viewport.height : progress;
  558 |       const targetY = Math.max(0, startY - viewport.height * progress);
  559 |       await dispatchSingleTouch(root, "touchmove", startX, targetY);
  560 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeGreaterThanOrEqual(expectedProgress - 0.035);
  561 |       await expect.poll(async () => Number(await root.getAttribute("data-swipe-progress"))).toBeLessThanOrEqual(expectedProgress + 0.035);
  562 |       await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  563 |       const state = await readTransitionMetric(page);
  564 |       states.push(state);
  565 |       await captureEvidence(page, testInfo, `${viewport.name}-transition-${String(progress * 100).padStart(3, "0")}`);
  566 |     }
  567 | 
  568 |     expect(states).toHaveLength(transitionProgress.length);
  569 |     expect(states[0].guideOpacity).toBeGreaterThanOrEqual(0.94);
  570 |     expect(states.at(-1)?.destinationOpacity).toBeGreaterThanOrEqual(0.94);
  571 |     for (let index = 0; index < states.length; index += 1) {
  572 |       const state = states[index];
  573 |       expect(state.blurredRoots, `full-frame blur at ${transitionProgress[index] * 100}%`).toEqual([]);
  574 |       expect(state.coverage, `painted coverage at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.78);
  575 |       if (index > 0) {
  576 |         expect(state.guideOpacity).toBeLessThanOrEqual(states[index - 1].guideOpacity + 0.03);
  577 |         expect(state.destinationOpacity).toBeGreaterThanOrEqual(states[index - 1].destinationOpacity - 0.03);
  578 |       }
  579 |       if (index > 0 && index < states.length - 1) {
  580 |         expect(state.guideOpacity).toBeGreaterThan(0.06);
  581 |         expect(state.destinationOpacity).toBeGreaterThan(0.16);
  582 |         expect(state.overlap, `spatial overlap at ${transitionProgress[index] * 100}%`).toBeGreaterThanOrEqual(0.12);
  583 |       }
  584 |       if (transitionProgress[index] <= .8) {
  585 |         expect(state.destinationBatchOpacity, `latest-batch must stay hidden at ${transitionProgress[index] * 100}%`).toBeLessThanOrEqual(.03);
  586 |       }
  587 |     }
  588 |     expect(states.at(-1)?.destinationBookOpacity).toBeGreaterThanOrEqual(.94);
  589 |     expect(states.at(-1)?.destinationBatchOpacity).toBeGreaterThanOrEqual(.94);
  590 | 
  591 |     await startHandoffCoverageProbe(page);
  592 |     await dispatchSingleTouch(root, "touchend", startX, 0);
  593 |     const routeBuffer = page.locator("#h5-guide-route-buffer-host > .h5-guide-route-buffer");
  594 |     await expect(routeBuffer).toBeVisible({ timeout: 5_000 });
  595 |     const routeProfile = await root.getAttribute("data-guide-profile") ?? "portrait-standard";
  596 |     await expect(routeBuffer).toHaveAttribute("data-guide-profile", routeProfile);
  597 |     await expect(routeBuffer).toHaveAttribute("data-commit-state", /^(prepared|committing)$/);
  598 |     await expectDecodedImages(routeBuffer, "img", 2);
  599 |     await expectLayeredGuideDestination(routeBuffer.locator(".h5-guide-route-destination-content"));
  600 |     if (routeProfile === "portrait-standard" || routeProfile === "portrait-compact") {
  601 |       const routeSnapshot = routeBuffer.locator(".h5-guide-route-snapshot");
  602 |       const routeSnapshotImage = routeSnapshot.locator(".h5-guide-route-portrait-snapshot");
  603 |       await expect(routeSnapshotImage).toHaveCount(1);
  604 |       await expect(routeSnapshot.locator(".guide-compact-portrait-composition")).toHaveCount(0);
  605 |       const routeSnapshotBox = await routeSnapshot.boundingBox();
  606 |       expect(routeSnapshotBox).not.toBeNull();
  607 |       if (!routeSnapshotBox) throw new Error("portrait route snapshot has no layout box");
  608 |       expect(routeSnapshotBox.width / routeSnapshotBox.height).toBeCloseTo(6 / 13, 3);
  609 |       expect(routeSnapshotBox.x + routeSnapshotBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
> 610 |       expect(routeSnapshotBox.y + routeSnapshotBox.height / 2).toBeCloseTo(viewport.height / 2, 0);
      |                                                                ^ Error: expect(received).toBeCloseTo(expected, precision)
  611 |       expect(routeSnapshotBox.width).toBeCloseTo(Math.min(viewport.width, expectedMaximumFrameWidth), 0);
  612 |       expect(routeSnapshotBox.height).toBeCloseTo(Math.min(viewport.width, expectedMaximumFrameWidth) * 13 / 6, 0);
  613 |       await expect.poll(async () => routeSnapshotImage.evaluate((element) => element instanceof HTMLImageElement
  614 |         && element.complete
  615 |         && element.naturalWidth === 750
  616 |         && element.naturalHeight === 1625
  617 |         && getComputedStyle(element).objectFit === "fill")).toBe(true);
  618 |     } else {
  619 |       await expect(routeBuffer.locator(".h5-guide-route-portrait-snapshot")).toHaveCount(0);
  620 |     }
  621 |     const routeDestinationBox = await routeBuffer.locator(".h5-guide-route-destination-content").boundingBox();
  622 |     expect(routeDestinationBox).not.toBeNull();
  623 |     if (!routeDestinationBox) throw new Error("route destination frame has no box");
  624 |     expect(routeDestinationBox.width).toBeCloseTo(guideFrame.width, 0);
  625 |     expect(routeDestinationBox.x).toBeCloseTo(guideFrame.x, 0);
  626 | 
  627 |     await page.waitForURL(/\/reports$/, { timeout: 15_000 });
  628 |     const archive = page.locator(".reports-archive-final");
  629 |     await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  630 |     await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  631 |     await expect(archive).toHaveAttribute("data-deferred-artwork", "mounted");
  632 |     await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  633 |     const archiveBox = await expectFrameWidth(archive, viewport.width);
  634 |     expect(archiveBox.width).toBeCloseTo(guideFrame.width, 0);
  635 |     expect(archiveBox.x).toBeCloseTo(guideFrame.x, 0);
  636 |     await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  637 |     const handoffSamples = await stopHandoffCoverageProbe(page);
  638 |     expect(handoffSamples.length).toBeGreaterThan(4);
  639 |     const emptySamples = handoffSamples.filter((sample) => sample.coverage < 0.72);
  640 |     expect(emptySamples, `handoff samples with insufficient painted content: ${JSON.stringify(emptySamples.slice(0, 5))}`).toEqual([]);
  641 |     const stagedSamples = handoffSamples.filter((sample) => sample.bookOpacity !== null && sample.batchOpacity !== null);
  642 |     expect(stagedSamples.length).toBeGreaterThan(4);
  643 |     const revealingSamples = stagedSamples.filter((sample) => sample.path === "/reports" && sample.routeState === "revealing");
  644 |     expect(revealingSamples.length).toBeGreaterThan(0);
  645 |     expect(revealingSamples.every((sample) => !sample.fallbackVisible), "the full archive fallback must not paint over staged entry groups").toBe(true);
  646 |     expect(revealingSamples.every((sample) => sample.ribbonImages === 1), "the unlock ribbon must remain one stable compositor image").toBe(true);
  647 |     expect(revealingSamples.every((sample) => sample.ribbonProgress === 0 && sample.ribbonState === "idle"), "route handoff must not reveal then reset the ribbon").toBe(true);
  648 |     expect(revealingSamples.every((sample) => sample.ribbonClip !== null
  649 |       && sample.ribbonClip !== "none"
  650 |       && !/^inset\((?:0(?:px|%)?(?:\s+|$)){1,4}\)$/i.test(sample.ribbonClip)), "the route handoff must keep only the approved initial ribbon tip visible").toBe(true);
  651 |     const firstVisibleBatch = stagedSamples.findIndex((sample) => (sample.batchOpacity ?? 0) > .03);
  652 |     expect(firstVisibleBatch).toBeGreaterThan(0);
  653 |     expect(stagedSamples.slice(0, firstVisibleBatch).every((sample) => (sample.batchOpacity ?? 0) <= .03)).toBe(true);
  654 |     for (let index = firstVisibleBatch + 1; index < stagedSamples.length; index += 1) {
  655 |       expect(stagedSamples[index].batchOpacity ?? 0, "latest-batch must not disappear after its first paint")
  656 |         .toBeGreaterThanOrEqual((stagedSamples[index - 1].batchOpacity ?? 0) - .04);
  657 |     }
  658 |     const firstRelease = stagedSamples.findIndex((sample) => sample.bufferReleasing);
  659 |     expect(firstRelease).toBeGreaterThan(0);
  660 |     expect(stagedSamples[firstRelease].routeBatchOpacity ?? 0, "handoff buffer must remain until the second group settles")
  661 |       .toBeGreaterThanOrEqual(.97);
  662 |     await captureEvidence(page, testInfo, `${viewport.name}-transition-complete`);
  663 |     await expectNoHorizontalOverflow(page, viewport.width);
  664 |     resources.stop();
  665 |     expect(resources.failures).toEqual([]);
  666 |   });
  667 | }
  668 | 
  669 | test("canonical guide still matches the approved 750px visual baseline", async ({ page }, testInfo) => {
  670 |   test.skip(testInfo.project.name !== "android-chromium", "one engine owns the pixel baseline; both engines run geometry gates");
  671 |   await page.emulateMedia({ reducedMotion: "reduce" });
  672 |   await page.setViewportSize({ width: 750, height: 1624 });
  673 |   await page.goto("/go", { waitUntil: "domcontentloaded" });
  674 |   const stage = page.locator(".brand-guide-stage");
  675 |   await expect(stage).toHaveAttribute("data-destination-state", "ready", { timeout: 15_000 });
  676 |   await expectDecodedImages(stage, "img", 1);
  677 |   await expect(stage).toHaveScreenshot("source-guide-normalized-750x1624.png", {
  678 |     animations: "disabled",
  679 |     scale: "css",
  680 |     maxDiffPixelRatio: 0.025,
  681 |   });
  682 | });
  683 | 
  684 | test("archive fallback survives delayed decode, failed assets, and a clean retry", async ({ page }) => {
  685 |   const blockedAsset = /\/module-1-title(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  686 |   let releaseAsset!: () => void;
  687 |   const assetReleased = new Promise<void>((resolve) => { releaseAsset = resolve; });
  688 |   await page.setViewportSize({ width: 375, height: 812 });
  689 |   await page.route(blockedAsset, async (route) => {
  690 |     await assetReleased;
  691 |     await route.continue();
  692 |   });
  693 |   await page.goto("/reports", { waitUntil: "domcontentloaded" });
  694 |   const archive = page.locator(".reports-archive-final");
  695 |   const fallback = page.locator(".reports-archive-reference-fallback");
  696 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "false");
  697 |   await expect(archive).toHaveAttribute("data-archive-artwork-failed", "false");
  698 |   await expect(fallback).toBeVisible();
  699 |   await page.waitForTimeout(350);
  700 |   await expect(fallback).toBeVisible();
  701 |   releaseAsset();
  702 |   await page.unrouteAll({ behavior: "wait" });
  703 |   await expect(archive).toHaveAttribute("data-archive-artwork-ready", "true", { timeout: 25_000 });
  704 |   await expectDecodedImages(archive, ".reports-archive-source-layer", 10);
  705 |   await expect(fallback).toBeHidden();
  706 |   await expect(fallback).toHaveAttribute("data-fallback-image", "released");
  707 |   await expect(fallback.locator("img")).toHaveCount(0);
  708 | 
  709 |   const failedAsset = /\/module-1-badge(?:\.runtime)?\.(?:webp|png)(?:\?|$)/;
  710 |   const expectedFailure = (request: Request) => failedAsset.test(request.url());
```