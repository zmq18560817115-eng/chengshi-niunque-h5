import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const skipWebServer = process.env.E2E_SKIP_WEB_SERVER === "true";
const serverCommand = process.env.E2E_SERVER_COMMAND
  ?? (process.env.CI ? "pnpm start" : "pnpm dev");
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", {
      open: "never",
      outputFolder: process.env.PLAYWRIGHT_HTML_REPORT ?? "playwright-report",
    }],
  ],
  snapshotPathTemplate: "{testDir}/../../design-qa-evidence/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.025,
    },
  },
  webServer: skipWebServer ? undefined : {
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL,
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "android-chromium",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        launchOptions: executablePath ? { executablePath } : undefined,
      },
    },
    {
      // Keep the historical suite on Chromium, but run the P1 visual and
      // touch-heavy image viewer contracts against mobile WebKit as well.
      name: "mobile-webkit-p1",
      testMatch: /(?:p1-regression|report-image-viewer)\.spec\.ts/,
      use: {
        browserName: "webkit",
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        locale: "zh-CN",
      },
    },
  ],
});
