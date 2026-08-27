import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({ testDir: "./tests/e2e", webServer: { command: "pnpm dev", url: baseURL, reuseExistingServer: !process.env.CI }, use: { baseURL, ...devices["iPhone 13"], browserName: "chromium", launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined } });
