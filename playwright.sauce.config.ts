/**
 * Sauce Labs hybrid: Playwright on the agent, browser via Selenium Grid (`SELENIUM_REMOTE_URL`).
 * Used only by `src/test/ui/scripts/run-playwright-sauce*.{sh,ts}` (`yarn test:sauce:*`).
 * Reuses viewport/capture defaults from `./playwright.config`; Sauce-only reporters and launch args are below.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import * as process from 'node:process';

import type { PlaywrightTestConfig } from '@playwright/test';
import { defineConfig, devices } from '@playwright/test';

export const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

export const artifactCapture = {
  screenshot: { mode: 'on' as const, fullPage: true },
  video: 'on' as const,
  trace: 'on-first-retry' as const,
};

function sauceViewport(): { width: number; height: number } {
  const w = Number.parseInt(process.env.SAUCE_VIEWPORT_WIDTH ?? '1280', 10);
  const h = Number.parseInt(process.env.SAUCE_VIEWPORT_HEIGHT ?? '960', 10);
  return {
    width: Number.isFinite(w) ? w : 1280,
    height: Number.isFinite(h) ? h : 960,
  };
}

function sauceChromiumLaunchArgs(viewport: { width: number; height: number }) {
  return {
    args: ['--start-maximized', `--window-size=${viewport.width},${viewport.height}`, '--window-position=0,0'],
  };
}

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
        environmentInfo: { os_version: process.version },
      },
    ]);
  } catch {
    /* optional */
  }
  try {
    requireFromProject.resolve('@saucelabs/playwright-reporter');
    reporters.push([
      '@saucelabs/playwright-reporter',
      {
        region: process.env.SAUCE_PLAYWRIGHT_REGION || 'eu-central-1',
        buildName: process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local',
        tags: ['pcs-frontend', 'crossbrowser', 'playwright'],
      },
    ]);
  } catch {
    /* optional */
  }
  return reporters;
}

function buildProjects(): PlaywrightTestConfig['projects'] {
  const isMultiBrowserProfile = !!process.env.CI || process.env.ENABLE_MULTI_BROWSER_PROJECTS === 'true';
  const viewport = sauceViewport();
  const sauceLaunch = sauceChromiumLaunchArgs(viewport);

  const projects: NonNullable<PlaywrightTestConfig['projects']> = [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ...artifactCapture,
        javaScriptEnabled: true,
        viewport,
        headless: !!process.env.CI,
        launchOptions: sauceLaunch,
      },
    },
  ];

  if (!isMultiBrowserProfile) {
    return projects;
  }

  const edgeViewport = viewport;
  const edgeLaunch = sauceChromiumLaunchArgs(edgeViewport);

  projects.push(
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
        viewport: edgeViewport,
        headless: !!process.env.CI,
        launchOptions: edgeLaunch,
      },
    }
  );

  return projects;
}

export default defineConfig({
  testDir: 'src/test/ui',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: 4,
  timeout: 600 * 1000,
  expect: { timeout: 30 * 1000 },
  use: { actionTimeout: 30 * 1000, navigationTimeout: 30 * 1000 },
  reportSlowTests: { max: 15, threshold: 5 * 60 * 1000 },
  globalSetup: './src/test/ui/config/global-setup.config.ts',
  reporter: buildReporters(),
  projects: buildProjects(),
});
