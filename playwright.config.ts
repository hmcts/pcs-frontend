import * as process from 'node:process';
import path from 'path';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
export const VERY_SHORT_TIMEOUT = 1000;
export const SHORT_TIMEOUT = 5000;
export const actionRetries = 10;
export const waitForPageRedirectionTimeout = SHORT_TIMEOUT;

const enable_all_page_functional_tests = process.env.ENABLE_ALL_PAGE_FUNCTIONAL_TESTS || 'false';
if (enable_all_page_functional_tests.toLowerCase() === 'true') {
  process.env.ENABLE_CONTENT_VALIDATION = 'true';
  process.env.ENABLE_VISIBILITY_VALIDATION = 'true';
  process.env.ENABLE_ERROR_MESSAGES_VALIDATION = 'true';
  process.env.ENABLE_NAVIGATION_TESTS = 'true';
}

export const enable_pft_debug_log = false;
export const enable_content_validation = process.env.ENABLE_CONTENT_VALIDATION || 'false';
export const enable_visibility_validation = process.env.ENABLE_VISIBILITY_VALIDATION || 'false';
export const enable_error_message_validation = process.env.ENABLE_ERROR_MESSAGES_VALIDATION || 'false';
export const enable_navigation_tests = process.env.ENABLE_NAVIGATION_TESTS || 'false';
export const enable_axe_audit = process.env.ENABLE_AXE_AUDIT || 'true';

// Skip Allure when explicitly disabled, or when allure-playwright is not installed (e.g. some local runs).
function isAllurePlaywrightInstalled(): boolean {
  try {
    require.resolve('allure-playwright');
    return true;
  } catch {
    return false;
  }
}

const useAllureReporter = process.env.PLAYWRIGHT_SKIP_ALLURE !== 'true' && isAllurePlaywrightInstalled();

// `.sauce/*.yml` sets PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS=true for full video/screenshots/trace on Sauce.
const sauceRichCapture = process.env.PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS === 'true';

const captureSettings = sauceRichCapture
  ? {
      screenshot: 'on' as const,
      video: 'on' as const,
      trace: 'on' as const,
    }
  : {
      screenshot: 'only-on-failure' as const,
      video: 'retain-on-failure' as const,
      trace: 'on-first-retry' as const,
    };

export default defineConfig({
  testDir: './src/test/ui',
  /* Run tests in files in parallel */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  timeout: 600 * 1000,
  expect: { timeout: 10 * 1000 },
  use: { actionTimeout: 10 * 1000, navigationTimeout: 30 * 1000 },
  /* Report slow tests if they take longer than 5 mins */
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalTeardown: require.resolve('./src/test/ui/config/global-teardown.config'),
  reporter: useAllureReporter
    ? [
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
      ]
    : [['list']],
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
      fullyParallel: false,
      workers: 1,
      use: sauceRichCapture ? { ...captureSettings } : {},
    },
    {
      name: 'chrome',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ...captureSettings,
        javaScriptEnabled: true,
        viewport: DEFAULT_VIEWPORT,
        headless: !!process.env.CI,
      },
    },
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            dependencies: ['setup'],
            use: {
              ...devices['Desktop Firefox'],
              browserName: 'firefox' as const,
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'webkit',
            dependencies: ['setup'],
            use: {
              ...devices['Desktop Safari'],
              browserName: 'webkit' as const,
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MobileChrome',
            dependencies: ['setup'],
            use: {
              ...devices['Pixel 5'],
              channel: 'chrome',
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MobileSafari',
            dependencies: ['setup'],
            use: {
              ...devices['iPhone 12'],
              browserName: 'webkit' as const,
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MicrosoftEdge',
            dependencies: ['setup'],
            use: {
              ...devices['Desktop Edge'],
              ...(sauceRichCapture ? {} : { channel: 'msedge' as const }),
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
        ]
      : []),
  ],
});
