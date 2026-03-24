import { createRequire } from 'node:module';
import { join } from 'node:path';
import * as process from 'node:process';

import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig, devices } from '@playwright/test';

function buildReporters(): PlaywrightTestConfig['reporter'] {
  const reporters: PlaywrightTestConfig['reporter'] = [['list']];
  const requireFromProject = createRequire(join(process.cwd(), 'package.json'));
  try {
    requireFromProject.resolve('allure-playwright');
    reporters.push([
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        suiteTitle: false,
        environmentInfo: {
          os_version: process.version,
        },
      },
    ]);
  } catch {
    // Allure is a devDependency; omit when unavailable (e.g. Sauce Playwright runner VM).
  }
  // When using Selenium → Sauce (not saucectl), upload a Playwright report to Sauce and print dashboard links.
  if (process.env.SELENIUM_REMOTE_URL) {
    try {
      requireFromProject.resolve('@saucelabs/playwright-reporter');
      const sauceReporterRegion = process.env.SAUCE_PLAYWRIGHT_REGION || 'eu-central-1';
      reporters.push([
        '@saucelabs/playwright-reporter',
        {
          region: sauceReporterRegion,
          buildName: process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local',
          tags: ['pcs-frontend', 'crossbrowser', 'playwright'],
        },
      ]);
    } catch {
      // Add devDependency @saucelabs/playwright-reporter for Sauce UI links and result upload.
    }
  }
  return reporters;
}

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

/** Full-page screenshot at end of each test + full session video, kept for pass and fail (not only-on-failure). */
const artifactCapture = {
  screenshot: { mode: 'on' as const, fullPage: true },
  video: 'on' as const,
  trace: 'on-first-retry' as const,
};

/** When using remote Selenium (Sauce), match a smaller desktop so login fields are readable in Sauce video. */
const useSauceSizedViewport = !!process.env.SELENIUM_REMOTE_URL;
const sauceW = Number.parseInt(process.env.SAUCE_VIEWPORT_WIDTH ?? '1280', 10);
const sauceH = Number.parseInt(process.env.SAUCE_VIEWPORT_HEIGHT ?? '960', 10);
const effectiveViewport = useSauceSizedViewport
  ? {
      width: Number.isFinite(sauceW) ? sauceW : 1280,
      height: Number.isFinite(sauceH) ? sauceH : 960,
    }
  : DEFAULT_VIEWPORT;

/** Sauce Selenium: one large Chromium window (avoids tiny app window in a corner vs empty data:, tab). Matches SAUCE_SCREEN_RESOLUTION / viewport. */
const sauceChromiumLaunchOptions = useSauceSizedViewport
  ? {
      args: [
        '--start-maximized',
        `--window-size=${effectiveViewport.width},${effectiveViewport.height}`,
        '--window-position=0,0',
      ],
    }
  : undefined;
export const VERY_SHORT_TIMEOUT = 1000;
export const SHORT_TIMEOUT = 5000;
export const actionRetries = 10;
export const waitForPageRedirectionTimeout = SHORT_TIMEOUT;
const env = process.env.ENVIRONMENT?.toLowerCase() || 'preview';

/** Include firefox/webkit/mobile projects on CI or when ENABLE_MULTI_BROWSER_PROJECTS=true (Sauce matrix sets this for Edge). */
const isMultiBrowserProfile =
  !!process.env.CI || process.env.ENABLE_MULTI_BROWSER_PROJECTS === 'true';

// Sauce Selenium Grid (SELENIUM_REMOTE_URL) only runs chrome + MicrosoftEdge from the matrix. Other projects are for CI or manual runs — see bin/sauce-matrix.default.json _disabled_matrix.

const enable_all_page_functional_tests = process.env.ENABLE_ALL_PAGE_FUNCTIONAL_TESTS || 'false';
if (enable_all_page_functional_tests === 'true') {
  process.env.ENABLE_CONTENT_VALIDATION = 'true';
  process.env.ENABLE_ERROR_MESSAGES_VALIDATION = 'true';
  process.env.ENABLE_NAVIGATION_TESTS = 'true';
}

export const enable_content_validation = process.env.ENABLE_CONTENT_VALIDATION || 'false';
export const enable_error_message_validation = process.env.ENABLE_ERROR_MESSAGES_VALIDATION || 'false';
export const enable_navigation_tests = process.env.ENABLE_NAVIGATION_TESTS || 'false';
export const enable_axe_audit = process.env.ENABLE_AXE_AUDIT || 'false';

export default defineConfig({
  testDir: './src/test/ui',
  /* Run tests in files in parallel */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 0,
  workers: env === 'preview' ? 1 : 1,
  timeout: 600 * 1000,
  expect: { timeout: 30 * 1000 },
  use: { actionTimeout: 30 * 1000, navigationTimeout: 30 * 1000 },
  /* Report slow tests if they take longer than 5 mins */
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalSetup: require.resolve('./src/test/ui/config/global-setup.config.ts'),
  globalTeardown: require.resolve('./src/test/ui/config/global-teardown.config'),
  reporter: buildReporters(),
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ...artifactCapture,
        javaScriptEnabled: true,
        viewport: effectiveViewport,
        headless: !!process.env.CI,
        ...(sauceChromiumLaunchOptions ? { launchOptions: sauceChromiumLaunchOptions } : {}),
      },
    },
    ...(isMultiBrowserProfile
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              channel: 'firefox',
              ...artifactCapture,
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
              ...artifactCapture,
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
              ...artifactCapture,
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
              ...artifactCapture,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'MicrosoftEdge',
            use: {
              ...devices['Desktop Edge'],
              channel: 'msedge',
              ...artifactCapture,
              javaScriptEnabled: true,
              viewport: useSauceSizedViewport ? effectiveViewport : DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
              ...(sauceChromiumLaunchOptions ? { launchOptions: sauceChromiumLaunchOptions } : {}),
            },
          },
        ]
      : []),
  ],
});
