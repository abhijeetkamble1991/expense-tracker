import { defineConfig, devices } from "@playwright/test";

const frontendPort = 4173;
const backendPort = 8000;
const viteCommand = `${process.execPath} ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort`;

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
      command: "uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
      url: `http://127.0.0.1:${backendPort}/health`,
      cwd: "..",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: viteCommand,
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
