import { expect, test } from "@playwright/test";
import type { Page, Request, Response } from "@playwright/test";

function collectReleaseAssetFailures(page: Page) {
  const failures: string[] = [];
  const relevant = (url: string) => {
    const path = new URL(url).pathname;
    return path.startsWith("/design/") || path.startsWith("/_next/") || path.startsWith("/reports/image/");
  };
  const onResponse = (response: Response) => {
    if (relevant(response.url()) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  };
  const onRequestFailed = (request: Request) => {
    if (relevant(request.url())) failures.push(`${request.failure()?.errorText ?? "request failed"} ${request.url()}`);
  };
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  return failures;
}

async function expectImagesDecode(page: Page, rootSelector: string, minimum: number) {
  await expect.poll(() => page.locator(rootSelector).locator("img").evaluateAll(async (images) => {
    if (images.length < minimum) return false;
    return (await Promise.all(images.map(async (image) => {
      if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth <= 0) return false;
      try {
        await image.decode?.();
        return true;
      } catch {
        return false;
      }
    }))).every(Boolean);
  }), { timeout: 20_000 }).toBe(true);
}

test("qualified rollback build serves guide, archive, health, and all release assets", async ({ page, request }) => {
  const failures = collectReleaseAssetFailures(page);
  const renderedReleaseAssets = new Set<string>();
  const rememberRenderedAssets = async (rootSelector: string) => {
    const urls = await page.locator(rootSelector).locator("img").evaluateAll((images) => images
      .map((image) => (image as HTMLImageElement).currentSrc)
      .filter(Boolean));
    urls.forEach((url) => renderedReleaseAssets.add(url));
  };
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  const guideResponse = await page.goto("/go", { waitUntil: "domcontentloaded" });
  expect(guideResponse?.status()).toBe(200);
  await expect(page.getByRole("region", { name: "品牌引导页" })).toBeVisible();
  await expectImagesDecode(page, ".brand-guide", 2);
  await rememberRenderedAssets(".brand-guide");

  const archiveResponse = await page.goto("/reports", { waitUntil: "domcontentloaded" });
  expect(archiveResponse?.status()).toBe(200);
  await expect(page.locator(".reports-archive-final")).toBeVisible({ timeout: 20_000 });
  await expectImagesDecode(page, ".reports-archive-final", 8);
  await rememberRenderedAssets(".reports-archive-final");
  expect(renderedReleaseAssets.size).toBeGreaterThanOrEqual(10);
  for (const url of renderedReleaseAssets) {
    const response = await request.head(url);
    expect(response.status(), `rollback asset ${url}`).toBeLessThan(400);
    if (new URL(url).pathname.startsWith("/design/")) {
      const cacheControl = response.headers()["cache-control"] ?? "";
      const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl)?.[1];
      expect(Number(maxAge), `rollback asset cache policy ${url}: ${cacheControl}`).toBeGreaterThan(0);
    }
  }
  expect(failures).toEqual([]);
});
