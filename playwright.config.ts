import * as process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
export const VERY_SHORT_TIMEOUT = 1000;
export const SHORT_TIMEOUT = 5000;
export const actionRetries = 10;
export const waitForPageRedirectionTimeout = SHORT_TIMEOUT;

const enable_all_page_functional_tests = process.env.ENABLE_ALL_PAGE_FUNCTIONAL_TESTS || 'false';
if (enable_all_page_functional_tests.toLowerCase() === 'true') {
  process.env.ENABLE_CONTENT_VALIDATION = 'true';
  process.env.ENABLE_ERROR_MESSAGES_VALIDATION = 'true';
  process.env.ENABLE_NAVIGATION_TESTS = 'true';
}

export const enable_content_validation = process.env.ENABLE_CONTENT_VALIDATION || 'false';
export const enable_error_message_validation = process.env.ENABLE_ERROR_MESSAGES_VALIDATION || 'false';
export const enable_navigation_tests = process.env.ENABLE_NAVIGATION_TESTS || 'false';
export const enable_axe_audit = process.env.ENABLE_AXE_AUDIT || 'false';

/** Sauce installs only `npm.packages` from `.sauce/*.yml` — `allure-playwright` is usually absent; skip if missing or explicitly disabled. */
function isAllurePlaywrightInstalled(): boolean {
  try {
    require.resolve('allure-playwright');
    return true;
  } catch {
    return false;
  }
}

const useAllureReporter = process.env.PLAYWRIGHT_SKIP_ALLURE !== 'true' && isAllurePlaywrightInstalled();

/** Set via `PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS` in `.sauce/*.yml` — full video, screenshots after each test, and trace (not used on local Jenkins E2E unless you export it). */
const sauceFullJourneyArtifacts = process.env.PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS === 'true';

const captureSettings = sauceFullJourneyArtifacts
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
  workers: 1,
  timeout: 600 * 1000,
  expect: { timeout: 10 * 1000 },
  use: { actionTimeout: 10 * 1000, navigationTimeout: 30 * 1000 },
  /* Report slow tests if they take longer than 5 mins */
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalSetup: require.resolve('./src/test/ui/config/global-setup.config.ts'),
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
  // Projects align with HMCTS "Browsers to test" guidance (~Feb 2026). Playwright runs on the host OS (e.g. Linux CI);
  // desktop entries approximate Windows/macOS installs. Mobile entries are emulated — not real device browsers.
  // iOS App Store Chrome/Edge/Safari all use WebKit on device; one WebKit+iPhone project covers Safari; iOS Chrome/Edge
  // are noted under MobileSafari. Samsung Internet has no Playwright browser — Chromium + Galaxy preset is a proxy only.
  projects: [
    // Windows + macOS — Google Chrome (latest stable).
    {
      name: 'chrome',
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
          // Windows + macOS — Mozilla Firefox (latest stable).
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              channel: 'firefox',
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          // macOS — Safari: Playwright bundles WebKit (not Apple’s Safari app); closest automated analogue for desktop Safari.
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              channel: 'webkit',
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          // Windows + macOS — Microsoft Edge (latest stable). Sauce: omit channel when PLAYWRIGHT_SAUCE_FULL_JOURNEY_ARTIFACTS is set.
          {
            name: 'MicrosoftEdge',
            use: {
              ...devices['Desktop Edge'],
              ...(sauceFullJourneyArtifacts ? {} : { channel: 'msedge' as const }),
              ...captureSettings,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          // Android — Google Chrome (latest stable); emulated handset (Pixel 5).
          {
            name: 'MobileChrome',
            use: {
              ...devices['Pixel 5'],
              channel: 'chrome',
              ...captureSettings,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          // Android — Mozilla Firefox (latest stable); emulated Pixel 5.
          {
            name: 'MobileFirefox',
            use: {
              ...devices['Pixel 5'],
              channel: 'firefox',
              ...captureSettings,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          // Android — Samsung Internet (latest stable): no Samsung browser in Playwright; Chromium + Galaxy S24 preset is a best-effort stand-in only.
          {
            name: 'AndroidSamsungInternet',
            use: {
              ...devices['Galaxy S24'],
              ...captureSettings,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          // iOS — Safari on supported iOS: WebKit + iPhone emulation. On real devices, App Store Chrome and Edge also use WebKit (same engine class).
          {
            name: 'MobileSafari',
            use: {
              ...devices['iPhone 12'],
              channel: 'webkit',
              ...captureSettings,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          // iOS — larger viewport / tablet-class WebKit (iPad); complements handset Safari coverage.
          {
            name: 'iPad',
            use: {
              ...devices['iPad Pro 11'],
              channel: 'webkit',
              ...captureSettings,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
        ]
      : []),
  ],
});
