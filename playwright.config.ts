import * as process from 'node:process';
import path from 'path';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { globSync } from 'glob';

dotenv.config({ path: path.resolve(__dirname, '.env') });

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
export const enable_axe_audit = process.env.ENABLE_AXE_AUDIT || 'true';

function resolveE2eSpecKeyword(raw: string | undefined): string | undefined {
  const keyword = raw?.trim();
  if (!keyword) {
    return undefined;
  }
  const testRoot = path.join(__dirname, 'src/test/ui');
  const specFiles = globSync('**/*.spec.ts', { cwd: testRoot, nodir: true });
  const hasMatch = specFiles.some(f => f.includes(keyword));
  if (!hasMatch) {
    // eslint-disable-next-line no-console -- intentional operator-facing warning when spec filter matches nothing
    console.warn(`[playwright] E2E_SPEC "${keyword}" matched no *.spec.ts files under src/test/ui — using all specs.`);
    return undefined;
  }
  return keyword;
}

const e2eSpecKeyword = resolveE2eSpecKeyword(process.env.E2E_SPEC);

function functionalTestGrepFromEnv(): RegExp | undefined {
  const scope = process.env.FUNCTIONAL_TEST_SCOPE?.trim();
  if (!scope) {
    return undefined;
  }
  return new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

const resolvedFunctionalGrep = functionalTestGrepFromEnv();

export default defineConfig({
  testDir: './src/test/ui',
  ...(e2eSpecKeyword ? { testMatch: [`**/*${e2eSpecKeyword}*.spec.ts`] } : {}),
  ...(resolvedFunctionalGrep ? { grep: resolvedFunctionalGrep } : {}),
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
