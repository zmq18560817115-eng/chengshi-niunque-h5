import { expect, test } from "@playwright/test";

const slugs = ["inspection-projects", "review-assurance", "production-traceability"] as const;

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
