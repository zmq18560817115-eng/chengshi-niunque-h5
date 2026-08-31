import { expect, test, type Page } from "@playwright/test";

async function historyLength(page: Page) {
  return page.evaluate(() => window.history.length);
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

test("fixed H5 hierarchy replaces forward routes and browser Back cannot reopen a swiped-away report", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go?hierarchy-sentinel=1");
  await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 10_000 });

  const fixedLength = await page.evaluate(() => {
    window.history.pushState({ ...window.history.state, hierarchyTest: true }, "", "/go");
    return window.history.length;
  });

  await page.getByRole("button", { name: "进入档案" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  expect(await historyLength(page)).toBe(fixedLength);

  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator("#h5-guide-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
  await inspection.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  expect(await historyLength(page)).toBe(fixedLength);

  await expect(page.locator("#h5-category-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
  const firstReport = page.locator(".category-card-hotspot").first();
  await expect(firstReport).toBeEnabled({ timeout: 15_000 });
  await firstReport.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);
  expect(await historyLength(page)).toBe(fixedLength);

  const reportUrl = page.url();
  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  expect(await historyLength(page)).toBe(fixedLength);

  await page.goBack();
  await expect(page).toHaveURL(/\/go\?hierarchy-sentinel=1$/);
  expect(page.url()).not.toBe(reportUrl);
});
