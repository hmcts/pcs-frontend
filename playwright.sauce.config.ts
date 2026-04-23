/**
 * Sauce Labs / saucectl only (see `.sauce/config-sauce-nightly.yml` → `configFile`).
 * - `testDir` is limited to cross-browser specs (tunnel: tokens in spec `beforeEach`).
 * - No `globalSetup`: IDAM/S2S must run from the worker after the tunnel is up.
 * - Jenkins / local UI tests use root `playwright.config.ts` + `globalSetup` there.
 */
import * as process from 'node:process';
import path from 'path';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const skipAllureReporter = process.env.PLAYWRIGHT_SKIP_ALLURE === 'true';
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

const is_smoke_run = process.env.npm_lifecycle_event === 'test:smoke';
const junit_result_output =
  process.env.PLAYWRIGHT_JUNIT_OUTPUT ||
  (is_smoke_run ? 'smoke-output/junit-result.xml' : 'functional-output/junit-result.xml');

export default defineConfig({
  testDir: './src/test/ui/sauceCrossbrowser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  timeout: 600 * 1000,
  expect: { timeout: 10 * 1000 },
  use: { actionTimeout: 10 * 1000, navigationTimeout: 30 * 1000 },
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalTeardown: require.resolve('./src/test/ui/config/global-teardown.config'),
  reporter: [
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: junit_result_output }] as const] : []),
    ...(skipAllureReporter
      ? []
      : ([
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
        ] as const)),
  ],
  projects: [
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
  ],
});
