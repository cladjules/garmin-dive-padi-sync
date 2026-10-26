import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  reporter: "line",
  testDir: "__tests__/browser",
  timeout: 30_000,
  webServer: {
    command: "pnpm dev",
    reuseExistingServer: true,
    timeout: 30_000,
    url: "http://127.0.0.1:5173/",
  },
  workers: 1,
});
