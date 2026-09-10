import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const slugs = ["inspection-projects", "review-assurance", "production-traceability"] as const;

async function interiorPoint(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  return button.evaluate((element) => {
    const box = element.getBoundingClientRect();
    for (const yRatio of [.5, .3, .7, .2, .8]) for (const xRatio of [.5, .3, .7, .2, .8]) {
      const x = box.left + box.width * xRatio, y = box.top + box.height * yRatio;
      if (document.elementFromPoint(x, y) === element) return { x, y };
    }
    throw new Error("The folder has no visible interior touch point");
  });
}

test.describe("iPhone-sized release activation", () => {
  test.use({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });

  for (const kind of ["cue", "folder"] as const) {
    test(`one ${kind} tap starts loading and navigates without a compatibility click`, async ({ page }) => {
      // Simulate iOS withholding click. The native touch/pointer stream is
      // unchanged, so this fails if navigation still depends on onClick.
      await page.addInitScript(() => document.addEventListener("click", (event) => {
        if ((event.target as Element).closest(".archive-category-hotspot, .archive-click-cue-hotspot")) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true));
      const releases = new Map<string, () => void>();
      const pending = new Map(slugs.map((slug) => [slug, new Promise<void>((resolve) => releases.set(slug, resolve))]));
      await page.route("**/reports/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const slug = slugs.find((item) => path === `/reports/${item}`);
        if (slug && route.request().headers().rsc === "1") await pending.get(slug);
        await route.continue();
      });
      try {
        await page.goto("/reports");
        for (const slug of slugs) {
          await expect(page.locator(".reports-archive-final")).toBeVisible();
          await expect(page.locator(".runtime-loading-layer:not(.is-persistent)")).toHaveCount(0);
          const button = page.locator(kind === "cue" ? `.archive-click-cue-hotspot[data-cue-slug="${slug}"]` : `.archive-category-hotspot[data-slug="${slug}"]`);
          const point = await interiorPoint(button);
          await page.touchscreen.tap(point.x, point.y);
          await expect(page.locator("html")).toHaveAttribute("data-category-loading-feedback", /.+/);
          await expect(page.locator("#h5-category-route-loading-host")).toBeVisible();
          // Readiness, rather than a fixed animation timeout, releases the page.
          await page.waitForTimeout(500);
          await expect(page.locator("#h5-category-route-loading-host")).toBeVisible();
          releases.get(slug)!();
          await expect(page).toHaveURL(new RegExp(`/reports/${slug}$`));
          await expect(page.locator(`.category-page-final[data-category="${slug}"]`)).toBeVisible();
          await expect(page.locator("html")).not.toHaveAttribute("data-category-loading-feedback", /.+/);
          await page.goBack();
          await expect(page).toHaveURL(/\/reports$/);
        }
      } finally {
        releases.forEach((release) => release());
        await page.unrouteAll({ behavior: "wait" });
      }
    });
  }
});

for (const viewport of [{ width: 360, height: 640 }, { width: 393, height: 780 }]) {
  test(`single native taps with finger drift navigate after every return at ${viewport.width}x${viewport.height}`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Native moving touch input uses the Chromium protocol.");
    await page.setViewportSize(viewport);
    const session = await page.context().newCDPSession(page);
    await page.goto("/reports");
    for (const slug of slugs) {
      await expect(page.locator(".reports-archive-final")).toBeVisible();
      await expect(page.locator(".runtime-loading-layer:not(.is-persistent)")).toHaveCount(0);
      const button = page.locator(`.archive-click-cue-hotspot[data-cue-slug="${slug}"]`);
      await expect(button).toBeEnabled();
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      if (!box) throw new Error("The category cue has no touch area.");
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      // The browser accepts this as a tap, although its diagonal travel exceeds
      // the previous application-level 10px click-cancellation threshold.
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 8, y: y + 8 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(page).toHaveURL(new RegExp(`/reports/${slug}$`));
      await expect(page.locator(`.category-page-final[data-category="${slug}"]`)).toBeVisible();
      await expect(page.locator("html")).not.toHaveAttribute("data-category-loading-feedback", /.+/);
      await page.goBack();
      await expect(page).toHaveURL(/\/reports$/);
    }
  });
}
