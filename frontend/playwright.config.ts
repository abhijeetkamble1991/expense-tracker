import { defineConfig, devices } from "@playwright/test";

const frontendPort = 4173;
const backendPort = 8000;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: "list",
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      url: `http://127.0.0.1:${backendPort}/health`,
      cwd: "..",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        "/Users/akamble/Library/pnpm/pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort",
      url: `http://127.0.0.1:${frontendPort}/login`,
      cwd: ".",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
