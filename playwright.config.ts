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

/** Build test file globs from E2E_SPEC (comma or semicolon keywords). Empty = run all specs. */
function testMatchFromE2eSpec(raw: string | undefined): string[] | undefined {
  const keys = raw
    ?.split(/[,;]/)
    .map(k => k.trim())
    .filter(Boolean);
  return keys?.length ? keys.map(k => `**/*${k}*.spec.ts`) : undefined;
}

const e2eSpecTestMatch = testMatchFromE2eSpec(process.env.E2E_SPEC);
const scopeForGrep = (process.env.E2E_TEST_SCOPE ?? '@nightly').trim();
const grepFromScope = scopeForGrep ? new RegExp(scopeForGrep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : undefined;

export default defineConfig({
  testDir: './src/test/ui',
  ...(e2eSpecTestMatch?.length ? { testMatch: e2eSpecTestMatch } : {}),
  ...(grepFromScope ? { grep: grepFromScope } : {}),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  timeout: 600 * 1000,
  expect: { timeout: 10 * 1000 },
  use: { actionTimeout: 10 * 1000, navigationTimeout: 30 * 1000 },
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
            name: 'edge',
            use: {
              ...devices['Desktop Edge'],
              channel: 'msedge',
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              viewport: DEFAULT_VIEWPORT,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'mobile-android',
            use: {
              ...devices['Pixel 5'],
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'mobile-ios',
            use: {
              ...devices['iPhone 12'],
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
          {
            name: 'mobile-ipad',
            use: {
              ...devices['iPad Pro 11'],
              screenshot: 'only-on-failure' as const,
              video: 'retain-on-failure' as const,
              trace: 'on-first-retry' as const,
              javaScriptEnabled: true,
              headless: !!process.env.CI,
            },
          },
        ]
      : []),
  ],
});
