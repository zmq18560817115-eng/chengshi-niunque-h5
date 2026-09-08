# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p1-regression.spec.ts >> portrait-440x820 preserves composition and all five handoff states
- Location: tests\e2e\p1-regression.spec.ts:411:7

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: locator('.brand-guide-character-open').first()
Expected: attached
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 5000ms
  - waiting for locator('.brand-guide-character-open').first()

```

```yaml
- main:
  - region "品牌引导页":
    - img "诚实纽雀品牌引导"
    - heading "Honest Nutri 品牌引导" [level=1]
    - text: 向上滑动，或点击下方提示进入档案
    - button "进入档案"
- alert
```

# Test source

```ts
  145 |   const expectedWidth = Math.min(viewportWidth, expectedMaximumFrameWidth);
  146 |   expect(box.width).toBeCloseTo(expectedWidth, 0);
  147 |   expect(box.x).toBeCloseTo((viewportWidth - expectedWidth) / 2, 0);
  148 |   return box;
  149 | }
  150 | 
  151 | async function alphaGeometry(image: Locator, stage: Locator) {
  152 |   return image.evaluate(async (node, stageElement) => {
  153 |     if (!(node instanceof HTMLImageElement) || !(stageElement instanceof HTMLElement)) return null;
  154 |     if (!node.complete || node.naturalWidth <= 0 || node.naturalHeight <= 0) return null;
  155 |     if (typeof node.decode === "function") await node.decode();
  156 | 
  157 |     const sampleScale = Math.min(1, 192 / Math.max(node.naturalWidth, node.naturalHeight));
  158 |     const sampleWidth = Math.max(1, Math.round(node.naturalWidth * sampleScale));
  159 |     const sampleHeight = Math.max(1, Math.round(node.naturalHeight * sampleScale));
  160 |     const canvas = document.createElement("canvas");
  161 |     canvas.width = sampleWidth;
  162 |     canvas.height = sampleHeight;
  163 |     const context = canvas.getContext("2d", { willReadFrequently: true });
  164 |     if (!context) return null;
  165 |     context.drawImage(node, 0, 0, sampleWidth, sampleHeight);
  166 |     const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  167 |     let minX = sampleWidth;
  168 |     let minY = sampleHeight;
  169 |     let maxX = -1;
  170 |     let maxY = -1;
  171 |     for (let y = 0; y < sampleHeight; y += 1) {
  172 |       for (let x = 0; x < sampleWidth; x += 1) {
  173 |         if (pixels[(y * sampleWidth + x) * 4 + 3] <= 12) continue;
  174 |         minX = Math.min(minX, x);
  175 |         minY = Math.min(minY, y);
  176 |         maxX = Math.max(maxX, x);
  177 |         maxY = Math.max(maxY, y);
  178 |       }
  179 |     }
  180 |     if (maxX < minX || maxY < minY) return null;
  181 | 
  182 |     const imageRect = node.getBoundingClientRect();
  183 |     const stageRect = stageElement.getBoundingClientRect();
  184 |     const style = getComputedStyle(node);
  185 |     const widthScale = imageRect.width / node.naturalWidth;
  186 |     const heightScale = imageRect.height / node.naturalHeight;
  187 |     let scaleX = widthScale;
  188 |     let scaleY = heightScale;
  189 |     if (style.objectFit === "contain" || style.objectFit === "cover") {
  190 |       const uniformScale = style.objectFit === "contain"
  191 |         ? Math.min(widthScale, heightScale)
  192 |         : Math.max(widthScale, heightScale);
  193 |       scaleX = uniformScale;
  194 |       scaleY = uniformScale;
  195 |     }
  196 |     const renderedWidth = node.naturalWidth * scaleX;
  197 |     const renderedHeight = node.naturalHeight * scaleY;
  198 |     const [positionX = "50%", positionY = "50%"] = style.objectPosition.split(/\s+/);
  199 |     const offsetFor = (position: string, freeSpace: number) => {
  200 |       if (position.endsWith("%")) return freeSpace * Number.parseFloat(position) / 100;
  201 |       const pixelsValue = Number.parseFloat(position);
  202 |       return Number.isFinite(pixelsValue) ? pixelsValue : freeSpace / 2;
  203 |     };
  204 |     const renderLeft = imageRect.left + offsetFor(positionX, imageRect.width - renderedWidth);
  205 |     const renderTop = imageRect.top + offsetFor(positionY, imageRect.height - renderedHeight);
  206 |     const alphaLeft = renderLeft + (minX / sampleWidth) * renderedWidth;
  207 |     const alphaTop = renderTop + (minY / sampleHeight) * renderedHeight;
  208 |     const alphaRight = renderLeft + ((maxX + 1) / sampleWidth) * renderedWidth;
  209 |     const alphaBottom = renderTop + ((maxY + 1) / sampleHeight) * renderedHeight;
  210 |     const visibleLeft = Math.max(stageRect.left, alphaLeft);
  211 |     const visibleTop = Math.max(stageRect.top, alphaTop);
  212 |     const visibleRight = Math.min(stageRect.right, alphaRight);
  213 |     const visibleBottom = Math.min(stageRect.bottom, alphaBottom);
  214 |     const alphaWidth = Math.max(1, alphaRight - alphaLeft);
  215 |     const alphaHeight = Math.max(1, alphaBottom - alphaTop);
  216 |     const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  217 |     const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  218 |     return {
  219 |       visibleFraction: (visibleWidth * visibleHeight) / (alphaWidth * alphaHeight),
  220 |       occupiedWidth: visibleWidth / Math.max(1, stageRect.width),
  221 |       occupiedHeight: visibleHeight / Math.max(1, stageRect.height),
  222 |     };
  223 |   }, await stage.elementHandle());
  224 | }
  225 | 
  226 | async function expectGuideSubjectOccupancy(page: Page) {
  227 |   const stage = page.locator(".brand-guide-stage");
  228 |   const artwork = page.locator(".brand-guide-artwork");
  229 |   const stageBox = await artwork.boundingBox();
  230 |   expect(stageBox).not.toBeNull();
  231 |   if (!stageBox) throw new Error("guide subject geometry is unavailable");
  232 | 
  233 |   if (stageBox.width > stageBox.height) {
  234 |     const composition = page.locator(".guide-landscape-composition");
  235 |     await expect(composition).toBeVisible();
  236 |     await expectDecodedImages(stage, ".guide-landscape-composition img", 6);
  237 |     const compositionBox = await composition.boundingBox();
  238 |     expect(compositionBox).not.toBeNull();
  239 |     if (!compositionBox) throw new Error("landscape composition has no layout box");
  240 |     expect(compositionBox.width).toBeCloseTo(stageBox.width, 0);
  241 |     expect(compositionBox.height).toBeCloseTo(stageBox.height, 0);
  242 |   } else {
  243 |     const character = page.locator(".brand-guide-character-open").first();
  244 |     const envelope = page.locator(".brand-guide-paper-bottom").first();
> 245 |     await expect(character).toBeAttached();
      |                             ^ Error: expect(locator).toBeAttached() failed
  246 |     await expect(envelope).toBeAttached();
  247 |     const [characterGeometry, envelopeGeometry] = await Promise.all([
  248 |       alphaGeometry(character, stage),
  249 |       alphaGeometry(envelope, stage),
  250 |     ]);
  251 |     expect(characterGeometry).not.toBeNull();
  252 |     expect(envelopeGeometry).not.toBeNull();
  253 |     if (!characterGeometry || !envelopeGeometry) throw new Error("portrait subject geometry is unavailable");
  254 |     expect(characterGeometry.occupiedWidth).toBeGreaterThanOrEqual(0.42);
  255 |     expect(characterGeometry.visibleFraction).toBeGreaterThanOrEqual(0.62);
  256 |     expect(envelopeGeometry.occupiedWidth).toBeGreaterThanOrEqual(0.44);
  257 |     expect(envelopeGeometry.visibleFraction).toBeGreaterThanOrEqual(0.58);
  258 |   }
  259 | 
  260 |   const hint = page.locator(stageBox.width > stageBox.height ? ".guide-landscape-hint" : ".brand-guide-entry-hint").first();
  261 |   await expect(hint).toBeVisible();
  262 |   const hintBox = await hint.boundingBox();
  263 |   expect(hintBox).not.toBeNull();
  264 |   if (!hintBox) throw new Error("guide hint geometry is unavailable");
  265 |   const hintVisibleWidth = Math.max(0, Math.min(stageBox.x + stageBox.width, hintBox.x + hintBox.width) - Math.max(stageBox.x, hintBox.x));
  266 |   const hintVisibleHeight = Math.max(0, Math.min(stageBox.y + stageBox.height, hintBox.y + hintBox.height) - Math.max(stageBox.y, hintBox.y));
  267 |   expect((hintVisibleWidth * hintVisibleHeight) / Math.max(1, hintBox.width * hintBox.height)).toBeGreaterThanOrEqual(0.94);
  268 |   expect(hintBox.width / stageBox.width).toBeGreaterThanOrEqual(0.26);
  269 | }
  270 | 
  271 | async function readTransitionMetric(page: Page): Promise<TransitionMetric> {
  272 |   return page.evaluate(() => {
  273 |     const root = document.querySelector<HTMLElement>(".brand-guide");
  274 |     const guide = document.querySelector<HTMLElement>(".brand-guide-stage");
  275 |     const guideArtwork = document.querySelector<HTMLElement>(".brand-guide-artwork");
  276 |     const destination = document.querySelector<HTMLElement>(".brand-guide-destination-preview");
  277 |     const destinationImage = document.querySelector<HTMLElement>(".brand-guide-destination-image");
  278 |     if (!root || !guide || !guideArtwork || !destination || !destinationImage) throw new Error("guide transition layers are unavailable");
  279 |     const viewportWidth = document.documentElement.clientWidth;
  280 |     const viewportHeight = document.documentElement.clientHeight;
  281 |     const viewportArea = Math.max(1, viewportWidth * viewportHeight);
  282 |     const guideRect = guide.getBoundingClientRect();
  283 |     const destinationRect = destination.getBoundingClientRect();
  284 |     const guideOpacity = Number.parseFloat(getComputedStyle(guide).opacity);
  285 |     const destinationOpacity = Number.parseFloat(getComputedStyle(destination).opacity);
  286 |     const area = (rect: DOMRect) => {
  287 |       const width = Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
  288 |       const height = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
  289 |       return width * height;
  290 |     };
  291 |     const effectiveOpacity = (element: Element) => {
  292 |       let opacity = 1;
  293 |       let current: Element | null = element;
  294 |       while (current) {
  295 |         const style = getComputedStyle(current);
  296 |         if (style.display === "none" || style.visibility === "hidden") return 0;
  297 |         opacity *= Number.parseFloat(style.opacity || "1");
  298 |         current = current.parentElement;
  299 |       }
  300 |       return opacity;
  301 |     };
  302 |     // Texture/background panels deliberately do not count as content. The
  303 |     // regression being guarded was a fully painted frame whose only visible
  304 |     // pixels were the two paper textures while both page subjects vanished.
  305 |     const subjectElements = [
  306 |       ".brand-guide-character-open",
  307 |       ".brand-guide-paper-bottom",
  308 |       ".brand-guide-fallback",
  309 |       ".guide-landscape-composition",
  310 |       ".brand-guide-destination-image",
  311 |     ].flatMap((selector) => [...document.querySelectorAll(selector)]);
  312 |     const subjectCoverage = Math.min(1, subjectElements.reduce((sum, element) => {
  313 |       if (element instanceof HTMLImageElement
  314 |         && (!element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0)) return sum;
  315 |       return sum + area(element.getBoundingClientRect()) * effectiveOpacity(element);
  316 |     }, 0) / viewportArea);
  317 |     const overlapWidth = Math.max(0, Math.min(guideRect.right, destinationRect.right) - Math.max(guideRect.left, destinationRect.left));
  318 |     const overlapHeight = Math.max(0, Math.min(guideRect.bottom, destinationRect.bottom) - Math.max(guideRect.top, destinationRect.top));
  319 |     const inspectedRoots = [root, guide, guideArtwork, destination, destinationImage];
  320 |     return {
  321 |       progress: Number(root.dataset.swipeProgress),
  322 |       coverage: subjectCoverage,
  323 |       overlap: (overlapWidth * overlapHeight) / viewportArea,
  324 |       guideOpacity,
  325 |       destinationOpacity,
  326 |       blurredRoots: inspectedRoots.flatMap((element) => {
  327 |         const filter = getComputedStyle(element).filter;
  328 |         return /blur\(/.test(filter) ? [`${element.className}: ${filter}`] : [];
  329 |       }),
  330 |     };
  331 |   });
  332 | }
  333 | 
  334 | async function captureEvidence(page: Page, testInfo: TestInfo, name: string) {
  335 |   await testInfo.attach(name, {
  336 |     body: await page.screenshot({ animations: "disabled" }),
  337 |     contentType: "image/png",
  338 |   });
  339 | }
  340 | 
  341 | async function startHandoffCoverageProbe(page: Page) {
  342 |   await page.evaluate(() => {
  343 |     const viewportArea = () => Math.max(1, document.documentElement.clientWidth * document.documentElement.clientHeight);
  344 |     const effectiveOpacity = (element: Element) => {
  345 |       let opacity = 1;
```