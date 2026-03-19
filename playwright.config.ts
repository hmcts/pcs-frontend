import * as process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
export const VERY_SHORT_TIMEOUT = 1000;
export const SHORT_TIMEOUT = 5000;
export const actionRetries = 10;
export const waitForPageRedirectionTimeout = SHORT_TIMEOUT;
const env = process.env.ENVIRONMENT?.toLowerCase() || 'preview';

const enable_all_page_functional_tests = process.env.ENABLE_ALL_PAGE_FUNCTIONAL_TESTS || 'false';
if (enable_all_page_functional_tests === 'true') {
  process.env.ENABLE_CONTENT_VALIDATION = 'true';
  process.env.ENABLE_ERROR_MESSAGES_VALIDATION = 'true';
  process.env.ENABLE_NAVIGATION_TESTS = 'true';
}

export const enable_content_validation = process.env.ENABLE_CONTENT_VALIDATION || 'false';
export const enable_error_message_validation = process.env.ENABLE_ERROR_MESSAGES_VALIDATION || 'false';
export const enable_navigation_tests = process.env.ENABLE_NAVIGATION_TESTS || 'false';
export const enable_axe_audit = process.env.ENABLE_AXE_AUDIT || 'true';

export default defineConfig({
  testDir: './src/test/ui',
  /* Run tests in files in parallel */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 0,
  workers: env === 'preview' ? 6 : 4,
  timeout: 300 * 1000,
  expect: { timeout: 5 * 1000 },
  use: { actionTimeout: 5 * 1000, navigationTimeout: 5 * 1000 },
  /* Report slow tests if they take longer than 5 mins */
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalSetup: require.resolve('./src/test/ui/config/global-setup.config.ts'),
  globalTeardown: require.resolve('./src/test/ui/config/global-teardown.config'),
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
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
        javaScriptEnabled: true,
        viewport: DEFAULT_VIEWPORT,
        headless: !!process.env.CI,
      },
    },
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              channel: 'firefox',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              channel: 'webkit',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MobileChrome',
            use: {
              ...devices['Pixel 5'],
              channel: 'MobileChrome',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MobileSafari',
            use: {
              ...devices['iPhone 12'],
              channel: 'MobileSafari',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MicrosoftEdge',
            use: {
              ...devices['Desktop Edge'],
              channel: 'MicrosoftEdge',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
        ]
      : []),
  ],
});
