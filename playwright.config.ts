import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./harness/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run build:ui && npm run dev:harness:web",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 30_000
  }
});
