import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  reporter: "line",
  testDir: "__tests__/browser",
  timeout: 30_000,
  workers: 1,
});
