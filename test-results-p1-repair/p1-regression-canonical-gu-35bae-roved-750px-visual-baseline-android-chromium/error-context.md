# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p1-regression.spec.ts >> canonical guide still matches the approved 750px visual baseline
- Location: tests\e2e\p1-regression.spec.ts:505:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
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
  38  |       samples: Array<{ at: number; coverage: number; active: string[]; path: string; routeState: string | null; bufferCount: number }>;
  39  |     };
  40  |   }
  41  | }
  42  | 
  43  | function isCriticalResource(url: string) {
  44  |   const parsed = new URL(url);
  45  |   return parsed.pathname.startsWith("/design/")
  46  |     || parsed.pathname.startsWith("/_next/")
  47  |     || parsed.pathname.startsWith("/reports/image/")
  48  |     || parsed.pathname === "/api/public/content";
  49  | }
  50  | 
  51  | function watchCriticalResources(page: Page, expectedFailure?: (request: Request) => boolean) {
  52  |   const failures: CriticalResourceFailure[] = [];
  53  |   const onResponse = (response: Response) => {
  54  |     const request = response.request();
  55  |     if (!isCriticalResource(response.url()) || expectedFailure?.(request)) return;
  56  |     if (response.status() >= 400) {
  57  |       failures.push({
  58  |         kind: "http",
  59  |         method: request.method(),
  60  |         status: response.status(),
  61  |         url: response.url(),
  62  |       });
  63  |     }
  64  |   };
  65  |   const onRequestFailed = (request: Request) => {
  66  |     if (!isCriticalResource(request.url()) || expectedFailure?.(request)) return;
  67  |     failures.push({
  68  |       kind: "network",
  69  |       method: request.method(),
  70  |       url: request.url(),
  71  |       error: request.failure()?.errorText,
  72  |     });
  73  |   };
  74  |   page.on("response", onResponse);
  75  |   page.on("requestfailed", onRequestFailed);
  76  |   return {
  77  |     failures,
  78  |     stop() {
  79  |       page.off("response", onResponse);
  80  |       page.off("requestfailed", onRequestFailed);
  81  |     },
  82  |   };
  83  | }
  84  | 
  85  | async function dispatchSingleTouch(root: Locator, type: "touchstart" | "touchmove" | "touchend", x: number, y: number) {
  86  |   await root.evaluate((element, eventInit) => {
  87  |     if (typeof Touch !== "function" || typeof TouchEvent !== "function") {
  88  |       throw new Error("This browser project does not expose native Touch/TouchEvent constructors");
  89  |     }
  90  |     const point = new Touch({
  91  |       identifier: 1,
  92  |       target: element,
  93  |       clientX: eventInit.x,
  94  |       clientY: eventInit.y,
  95  |       pageX: eventInit.x + window.scrollX,
  96  |       pageY: eventInit.y + window.scrollY,
  97  |       screenX: eventInit.x,
  98  |       screenY: eventInit.y,
  99  |     });
  100 |     const activeTouches = eventInit.type === "touchend" ? [] : [point];
  101 |     const event = new TouchEvent(eventInit.type, {
  102 |       bubbles: true,
  103 |       cancelable: true,
  104 |       composed: true,
  105 |       view: window,
  106 |       touches: activeTouches,
  107 |       targetTouches: activeTouches,
  108 |       changedTouches: [point],
  109 |     });
  110 |     element.dispatchEvent(event);
  111 |   }, { type, x, y });
  112 | }
  113 | 
  114 | async function expectNoHorizontalOverflow(page: Page, viewportWidth: number) {
  115 |   const dimensions = await page.evaluate(() => ({
  116 |     clientWidth: document.documentElement.clientWidth,
  117 |     scrollWidth: document.documentElement.scrollWidth,
  118 |   }));
  119 |   expect(dimensions.clientWidth).toBe(viewportWidth);
  120 |   expect(dimensions.scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  121 | }
  122 | 
  123 | async function expectDecodedImages(root: Locator, selector = "img", minimum = 1) {
  124 |   await expect.poll(async () => root.locator(selector).evaluateAll(async (images, imageMinimum) => {
  125 |     if (images.length < imageMinimum) return false;
  126 |     const decoded = await Promise.all(images.map(async (node) => {
  127 |       if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0 || node.naturalHeight <= 0) return false;
  128 |       if (typeof node.decode === "function") {
  129 |         try {
  130 |           await node.decode();
  131 |         } catch {
  132 |           return false;
  133 |         }
  134 |       }
  135 |       return true;
  136 |     }));
  137 |     return decoded.every(Boolean);
> 138 |   }, minimum), { timeout: 20_000 }).toBe(true);
      |                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  139 | }
  140 | 
  141 | async function expectFrameWidth(locator: Locator, viewportWidth: number) {
  142 |   const box = await locator.boundingBox();
  143 |   expect(box).not.toBeNull();
  144 |   if (!box) throw new Error("content frame has no layout box");
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
```