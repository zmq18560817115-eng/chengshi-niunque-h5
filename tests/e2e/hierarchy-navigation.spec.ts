import { expect, test, type Page } from "@playwright/test";

const hierarchyStateKey = "__honestNutriH5Hierarchy";

async function historyLength(page: Page) {
  return page.evaluate(() => window.history.length);
}

async function hierarchyParent(page: Page) {
  return page.evaluate((key) => window.history.state?.[key]?.parentHref ?? null, hierarchyStateKey);
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

async function waitForArchive(page: Page) {
  await expect(page.locator(".reports-archive-final")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#h5-guide-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
}

async function waitForCategory(page: Page) {
  await expect(page.locator(".category-page-final")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#h5-category-route-buffer-host > *")).toHaveCount(0, { timeout: 15_000 });
}

test("guide is replaced while category and report follow the platform Back hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go?hierarchy-sentinel=1");
  await expect(page.getByRole("button", { name: "进入档案" })).toBeEnabled({ timeout: 10_000 });

  const guideLength = await page.evaluate(() => {
    window.history.pushState({ ...window.history.state, hierarchyTest: true }, "", "/go");
    return window.history.length;
  });

  await page.getByRole("button", { name: "进入档案" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  expect(await historyLength(page)).toBe(guideLength);
  await waitForArchive(page);

  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  expect(await historyLength(page)).toBe(guideLength + 1);
  await expect.poll(() => hierarchyParent(page)).toBe("/reports");
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);

  const firstReport = page.locator(".category-card-hotspot").first();
  await expect(firstReport).toBeEnabled({ timeout: 15_000 });
  await firstReport.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);
  expect(await historyLength(page)).toBe(guideLength + 2);
  await expect.poll(() => hierarchyParent(page)).toBe("/reports/inspection-projects");
  await expect(page.getByRole("button", { name: "返回上一页" })).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  await waitForArchive(page);

  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  const reportUrl = page.url();
  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  expect(page.url()).not.toBe(reportUrl);

  await page.goForward();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await rightSwipe(page, ".category-page-final");
  await expect(page).toHaveURL(/\/reports$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/go\?hierarchy-sentinel=1$/);
});

test("a direct report link right-swipes to its canonical parent without reopening the report", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/go?direct-origin=1");
  await page.goto("/reports/inspection-projects/items/seed-card-inspection-nutrition/reports");
  await expect(page.locator(".report-page-final")).toBeVisible({ timeout: 15_000 });
  expect(await hierarchyParent(page)).toBeNull();

  const reportUrl = page.url();
  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/go\?direct-origin=1$/);
  expect(page.url()).not.toBe(reportUrl);
});

test("returning from a report restores the category reading position", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/reports");
  await waitForArchive(page);
  const inspection = page.locator('.archive-inspection-mascot-hotspot[data-mascot-slug="inspection-projects"]');
  await expect(inspection).toBeEnabled({ timeout: 15_000 });
  await inspection.click();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);

  const category = page.locator(".category-page-final");
  const savedScroll = await category.evaluate((element) => {
    element.scrollTop = Math.min(90, element.scrollHeight - element.clientHeight);
    return element.scrollTop;
  });
  expect(savedScroll).toBeGreaterThan(0);
  await page.locator(".category-card-hotspot").first().evaluate((element) => (element as HTMLElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await expect.poll(() => category.evaluate((element) => element.scrollTop)).toBeCloseTo(savedScroll, 0);

  const swipeSavedScroll = await category.evaluate((element) => {
    element.scrollTop = Math.min(44, element.scrollHeight - element.clientHeight);
    return element.scrollTop;
  });
  expect(swipeSavedScroll).toBeGreaterThan(0);
  await page.locator(".category-card-hotspot").first().evaluate((element) => (element as HTMLElement).click());
  await expect(page).toHaveURL(/\/reports\/inspection-projects\/items\/[^/]+\/reports$/);

  await rightSwipe(page, ".report-page-final");
  await expect(page).toHaveURL(/\/reports\/inspection-projects$/);
  await waitForCategory(page);
  await expect.poll(() => category.evaluate((element) => element.scrollTop)).toBeCloseTo(swipeSavedScroll, 0);
});
