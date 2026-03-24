import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/ui',
  globalSetup: require.resolve('./src/test/ui/config/global-setup.config.ts'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 1920, height: 1080 },
        headless: true,
        // Must be after device spread — presets can override top-level use and drop video/screenshots.
        screenshot: 'on',
        video: 'on',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        headless: true,
        screenshot: 'on',
        video: 'on',
        trace: 'retain-on-failure',
      },
    },
  ],
});
