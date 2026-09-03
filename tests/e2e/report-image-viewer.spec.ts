import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Locator, Page, Request, Response } from "@playwright/test";
import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

test.use({ browserName: "chromium", hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

const fixture = {
  // The public-data policy intentionally excludes ids prefixed with e2e-/test-.
  // This production-shaped record is isolated by a random id and removed in
  // afterAll, so the browser exercises the same allow-list as a real upload.
  id: `browser-image-fixture-${process.pid}-${Date.now()}`,
  storageKey: `e2e/image-viewer-${process.pid}-${Date.now()}.jpg`,
  path: "/reports/inspection-projects/items/seed-card-inspection-nutrition/reports",
};

function assertFixtureWritesAreIsolated() {
  if (process.env.E2E_FIXTURE_WRITES_ALLOWED !== "true") {
    throw new Error("Refusing to create a public browser fixture without E2E_FIXTURE_WRITES_ALLOWED=true");
  }
  const databaseUrl = process.env.DATABASE_URL;
  const storageUrl = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  if (!databaseUrl || !storageUrl || !bucket) throw new Error("DATABASE_URL, S3_ENDPOINT, and S3_BUCKET are required for isolated browser fixtures");
  const database = new URL(databaseUrl);
  const storage = new URL(storageUrl);
  const loopback = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!loopback.has(database.hostname) || !loopback.has(storage.hostname)) {
    throw new Error(`Refusing browser fixture writes outside loopback services: db=${database.hostname}, storage=${storage.hostname}`);
  }
  const isolationMarker = /(?:^|[-_])(?:e2e|test|ci)(?:[-_]|$)/i;
  const databaseName = database.pathname.replace(/^\//, "");
  if (!isolationMarker.test(databaseName) || !isolationMarker.test(bucket)) {
    throw new Error(`Refusing browser fixture writes without isolated database and bucket names: db=${databaseName}, bucket=${bucket}`);
  }
}

function watchReportAssetResponses(page: Page) {
  const failures: string[] = [];
  const isRelevantAsset = (url: string) => {
    const path = new URL(url).pathname;
    return path.startsWith("/reports/image/") || path.startsWith("/design/") || path.startsWith("/_next/");
  };
  const onResponse = (response: Response) => {
    if (isRelevantAsset(response.url()) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  };
  const onRequestFailed = (request: Request) => {
    if (isRelevantAsset(request.url())) failures.push(`${request.failure()?.errorText ?? "request failed"} ${request.url()}`);
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
      identifier: 7,
      target: element,
      clientX: eventInit.x,
      clientY: eventInit.y,
      pageX: eventInit.x + window.scrollX,
      pageY: eventInit.y + window.scrollY,
      screenX: eventInit.x,
      screenY: eventInit.y,
    });
    const activeTouches = eventInit.type === "touchend" ? [] : [point];
    element.dispatchEvent(new TouchEvent(eventInit.type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      touches: activeTouches,
      targetTouches: activeTouches,
      changedTouches: [point],
    }));
  }, { type, x, y });
}

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
  for (let index = 1; index <= 8; index += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
      x: from.x + (to.x - from.x) * index / 8,
      y: from.y + (to.y - from.y) * index / 8,
    }] });
    await page.waitForTimeout(25);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test.beforeAll(async () => {
  assertFixtureWritesAreIsolated();
  const [card, admin] = await Promise.all([
    prisma.reportCard.findUnique({ where: { id: "seed-card-inspection-nutrition" }, select: { id: true } }),
    prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);
  if (!card || !admin) throw new Error("deterministic image-report fixture prerequisites are missing");
  const body = readFileSync("public/design/final-v1/category-runtime/inspection-source.jpg");
  await getObjectStorage().put(fixture.storageKey, body, "image/jpeg");
  try {
    await prisma.reportAsset.create({
      data: {
        id: fixture.id,
        reportCardId: card.id,
        title: "浏览器交互图片报告",
        description: "自动化运行期间临时创建并清理",
        assetType: "IMAGE",
        openMode: "SAME_TAB",
        storageKey: fixture.storageKey,
        mimeType: "image/jpeg",
        byteSize: BigInt(body.byteLength),
        sortOrder: 99_999,
        contentStatus: "PUBLISHED",
        isOnline: true,
        publishedAt: new Date(),
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  } catch (error) {
    await getObjectStorage().remove(fixture.storageKey).catch(() => undefined);
    throw error;
  }
});

test.afterAll(async () => {
  await prisma.reportAsset.deleteMany({ where: { id: fixture.id } });
  await getObjectStorage().remove(fixture.storageKey).catch(() => undefined);
});

test("published report keeps its reading anchor when zoom enters the pan viewport", async ({ page }) => {
  await page.goto(fixture.path);
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "返回检测项目" })).toHaveCount(0);
  const report = page.locator(".image-report", { hasText: "浏览器交互图片报告" });
  const stage = report.locator(".report-image-stage");
  const image = stage.getByRole("img");
  await expect(stage).toBeVisible();
  await expect(image).toBeVisible();
  const zoomIn = report.getByRole("button", { name: "放大报告图片" });
  await zoomIn.scrollIntoViewIfNeeded();

  const before = await stage.evaluate((element) => ({
    height: element.clientHeight,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    ...(() => {
      const bounds = element.getBoundingClientRect();
      const anchorScreenY = (Math.max(0, bounds.top) + Math.min(innerHeight, bounds.bottom)) / 2;
      return { anchorScreenY, anchorContentY: element.scrollTop + anchorScreenY - bounds.top };
    })(),
  }));
  await zoomIn.click();
  await expect(image).toHaveAttribute("style", /width: 125%/);
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);

  const after = await stage.evaluate((element) => ({
    height: element.clientHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    boundsTop: element.getBoundingClientRect().top,
    scrollTop: element.scrollTop,
    scale: Number(element.closest(".image-report")?.getAttribute("data-scale")),
  }));
  expect(before.height).toBeGreaterThan(after.height);
  expect(after.scrollWidth).toBeGreaterThan(after.clientWidth);
  expect(after.pageWidth).toBe(before.pageWidth);
  expect(after.pageWidth).toBe(before.viewportWidth);
  expect((after.scrollTop + before.anchorScreenY - after.boundsTop) / after.scale).toBeCloseTo(before.anchorContentY, 0);
});

test("report image uses page scrolling at 100% and contained pan only after zoom", async ({ page }) => {
  const reportResponses = watchReportAssetResponses(page);
  await page.goto(fixture.path, { waitUntil: "domcontentloaded" });
  const report = page.locator(".image-report", { hasText: "浏览器交互图片报告" });
  const stage = report.locator(".report-image-stage");
  const image = stage.getByRole("img");
  await expect(stage).toHaveClass(/is-natural/);
  await expect(stage).not.toHaveAttribute("data-swipe-back-ignore");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(async (node) => {
    if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0) return false;
    await node.decode?.();
    return true;
  })).toBe(true);

  const natural = await stage.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(natural.scrollLeft).toBe(0);
  expect(natural.scrollTop).toBe(0);
  expect(natural.pageWidth).toBe(natural.viewportWidth);

  const stageBox = await stage.boundingBox();
  expect(stageBox).not.toBeNull();
  if (!stageBox) throw new Error("report viewer has no layout box");
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + Math.min(stageBox.height / 2, 120));
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width / 2 + 80, stageBox.y + Math.min(stageBox.height / 2, 120) + 30, { steps: 5 });
  await page.mouse.up();
  expect(await stage.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }))).toEqual({ left: 0, top: 0 });

  const beforePageScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 360);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforePageScroll);
  expect(await stage.evaluate((element) => element.scrollTop)).toBe(0);

  await report.getByRole("button", { name: "放大报告图片" }).click();
  await expect(stage).toHaveClass(/is-zoomed/);
  await expect(stage).toHaveAttribute("data-swipe-back-ignore", "true");
  await expect(image).toHaveAttribute("style", /width: 125%/);
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const zoomed = await stage.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(zoomed.scrollWidth).toBeGreaterThan(zoomed.clientWidth);
  expect(zoomed.pageWidth).toBe(natural.pageWidth);

  const zoomedBox = await stage.boundingBox();
  expect(zoomedBox).not.toBeNull();
  if (!zoomedBox) throw new Error("zoomed report viewer has no layout box");
  const dragX = zoomedBox.x + zoomedBox.width * 0.68;
  const dragY = zoomedBox.y + Math.min(zoomedBox.height * 0.55, 180);
  const reportUrl = page.url();
  await dispatchSingleTouch(stage, "touchstart", dragX, dragY);
  await dispatchSingleTouch(stage, "touchmove", dragX - 70, dragY - 70);
  await dispatchSingleTouch(stage, "touchend", dragX - 70, dragY - 70);
  await expect.poll(() => stage.evaluate((element) => element.scrollLeft + element.scrollTop))
    .toBeGreaterThan(zoomed.scrollLeft + zoomed.scrollTop + 20);
  const panned = await stage.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
  expect(panned.left + panned.top).toBeGreaterThan(zoomed.scrollLeft + zoomed.scrollTop + 20);
  expect(page.url()).toBe(reportUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(natural.viewportWidth);

  await report.getByRole("button", { name: "恢复报告图片原始大小" }).click();
  await expect(stage).toHaveClass(/is-natural/);
  await expect(stage).not.toHaveAttribute("data-swipe-back-ignore");
  await expect(image).toHaveAttribute("style", /width: 100%/);
  await expect.poll(() => stage.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }))).toEqual({ left: 0, top: 0 });
  reportResponses.stop();
  expect(reportResponses.failures).toEqual([]);
});

test("predictable placeholder report URLs return a real 404", async ({ request }) => {
  const paths = [
    "/reports/inspection-projects/items/placeholder-slot-1/reports",
    "/reports/inspection-projects/items/placeholder-slot-2/reports",
    "/reports/inspection-projects/items/placeholder-slot-3/reports",
    "/reports/review-assurance/items/placeholder-slot-1/reports",
    "/reports/review-assurance/items/placeholder-slot-2/reports",
    "/reports/review-assurance/items/placeholder-slot-3/reports",
    "/reports/production-traceability/items/placeholder-slot-1/reports",
    "/reports/production-traceability/items/placeholder-slot-2/reports",
  ];
  for (const path of paths) expect((await request.get(path)).status(), path).toBe(404);
  for (let index = 1; index <= 5; index += 1) {
    const path = `/design/reports/test-report-${index}.webp`;
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("native report touch chains at vertical edges without triggering swipe-back or passive errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(fixture.path);
  const report = page.locator(".image-report", { hasText: "浏览器交互图片报告" });
  const stage = report.locator(".report-image-stage");
  await expect(stage).toBeVisible();
  await expect(stage).toHaveClass(/is-loaded/);
  await expect(stage.getByRole("img")).toBeVisible();
  await report.getByRole("button", { name: "放大报告图片" }).click();
  await expect(stage).toHaveAttribute("data-swipe-back-ignore", "true");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await stage.scrollIntoViewIfNeeded();
  await stage.evaluate((element) => {
    const browserWindow = window as typeof window & { __reportTouchMoveCount?: number };
    browserWindow.__reportTouchMoveCount = 0;
    element.addEventListener("touchmove", () => { browserWindow.__reportTouchMoveCount = (browserWindow.__reportTouchMoveCount ?? 0) + 1; }, { passive: true });
    element.scrollTop = element.scrollHeight;
  });
  await expect.poll(() => stage.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)).toBe(true);
  const verticalBox = await stage.boundingBox();
  if (!verticalBox) throw new Error("Zoomed report stage is not visible");
  const { pageScrollBefore, maximumPageScroll } = await page.evaluate(() => ({ pageScrollBefore: scrollY, maximumPageScroll: document.documentElement.scrollHeight - innerHeight }));
  expect(maximumPageScroll).toBeGreaterThan(pageScrollBefore);
  const verticalX = verticalBox.x + verticalBox.width / 2;
  const verticalStartY = Math.min(760, verticalBox.y + verticalBox.height * .72);
  await touchDrag(page, { x: verticalX, y: verticalStartY }, { x: verticalX, y: verticalStartY - 220 });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __reportTouchMoveCount?: number }).__reportTouchMoveCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(pageScrollBefore);

  await stage.scrollIntoViewIfNeeded();
  const horizontalBox = await stage.boundingBox();
  if (!horizontalBox) throw new Error("Zoomed report stage is not visible after vertical scroll chaining");
  const urlBeforePan = page.url();
  const horizontalY = Math.min(760, horizontalBox.y + horizontalBox.height / 2);
  await touchDrag(page, { x: horizontalBox.x + 40, y: horizontalY }, { x: Math.min(360, horizontalBox.x + 190), y: horizontalY });
  expect(page.url()).toBe(urlBeforePan);
  expect(consoleErrors.filter((message) => message.includes("passive event listener"))).toEqual([]);
});
