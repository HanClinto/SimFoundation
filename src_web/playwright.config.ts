import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://127.0.0.1:4173/SimFoundation/",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: process.env.WEB_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173/SimFoundation/",
        reuseExistingServer: true,
      },
});
