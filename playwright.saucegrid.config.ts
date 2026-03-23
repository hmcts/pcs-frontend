import * as process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

/** Local Playwright + remote Chrome on Sauce (Selenium Grid / CDP). See `yarn test:crossbrowser:grid`. */
export default defineConfig({
  testDir: './src/test/ui',
  globalSetup: require.resolve('./src/test/ui/config/global-setup.config.ts'),
  globalTeardown: require.resolve('./src/test/ui/config/global-teardown.config'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 600 * 1000,
  expect: { timeout: 30 * 1000 },
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  use: {
    actionTimeout: 30 * 1000,
    navigationTimeout: 30 * 1000,
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
  },
  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        suiteTitle: false,
        environmentInfo: {
          os_version: process.version,
        },
      },
    ],
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: false,
      },
    },
  ],
});
