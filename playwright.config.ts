import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './src/tests/e2e/smoke',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 60_000,
  },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalSetup: './src/tests/e2e/smoke/global-setup.ts',
  globalTeardown: './src/tests/e2e/smoke/global-teardown.ts',
});
