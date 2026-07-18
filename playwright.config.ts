import { defineConfig, devices } from '@playwright/test';

const localBrowser = process.env['CI'] ? {} : { channel: 'msedge' as const };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'line' : 'html',
  use: {
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...localBrowser },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], ...localBrowser },
    },
  ],
});
