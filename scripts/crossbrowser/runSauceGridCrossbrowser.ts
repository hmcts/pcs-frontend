import { spawnSync } from 'node:child_process';
import * as path from 'path';

const root = path.join(__dirname, '../..');

const DEFAULT_GRID = 'https://ondemand.eu-central-1.saucelabs.com:443/wd/hub';

function buildCapabilitiesJson(): string {
  const username = process.env.SAUCE_USERNAME?.trim();
  const accessKey = process.env.SAUCE_ACCESS_KEY?.trim();
  if (!username || !accessKey) {
    throw new Error('SAUCE_USERNAME and SAUCE_ACCESS_KEY must be set');
  }

  const sauceOptions: Record<string, unknown> = {
    devTools: true,
    /** Enables Network + browser console in Sauce Test Details (Extended Debugging). */
    extendedDebugging: true,
    username,
    accessKey,
    name: process.env.SAUCE_JOB_NAME ?? 'pcs-frontend-crossbrowser-grid',
    build:
      process.env.SAUCE_BUILD ??
      process.env.BUILD_BUILD_ID ??
      process.env.BUILD_BUILDID ??
      `local-${new Date().toISOString().slice(0, 19)}`,
  };

  const tunnelName = process.env.SAUCE_TUNNEL_NAME?.trim();
  const tunnelOwner = process.env.SAUCE_TUNNEL_OWNER?.trim();
  if (tunnelName && tunnelOwner) {
    sauceOptions.tunnelName = tunnelName;
    sauceOptions.tunnelOwner = tunnelOwner;
  }

  return JSON.stringify({
    platformName: process.env.SAUCE_PLATFORM_NAME ?? 'Windows 11',
    browserName: 'chrome',
    'sauce:options': sauceOptions,
  });
}

function main(): number {
  try {
    process.env.SELENIUM_REMOTE_URL = (process.env.SELENIUM_REMOTE_URL ?? DEFAULT_GRID).trim();
    process.env.SELENIUM_REMOTE_CAPABILITIES = buildCapabilitiesJson();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error(
      'Export SAUCE_USERNAME and SAUCE_ACCESS_KEY (and SAUCE_TUNNEL_* if using Sauce Connect). See README — Sauce Labs (cross-browser).'
    );
    return 2;
  }

  const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const install = spawnSync(yarn, ['playwright', 'install'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (install.status !== 0) {
    return install.status ?? 1;
  }

  const result = spawnSync(
    yarn,
    [
      'playwright',
      'test',
      '--config',
      'playwright.saucegrid.config.ts',
      '--headed',
      '--project',
      'chromium',
      '--grep',
      '@crossbrowser',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    }
  );

  return result.status ?? 1;
}

process.exit(main());
