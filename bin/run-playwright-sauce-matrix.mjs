#!/usr/bin/env node
/**
 * Run @crossbrowser Playwright tests on Sauce across multiple OS × browser (EU Central hub).
 * Requires SAUCE_USERNAME, SAUCE_ACCESS_KEY. Matrix file: SAUCE_MATRIX_FILE or bin/sauce-matrix.default.json (only the `matrix` array runs; `_disabled_matrix` documents unsupported combos).
 * @see https://playwright.dev/docs/selenium-grid — remote path supports Chrome/Edge on Grid.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EU_HUB = 'https://ondemand.eu-central-1.saucelabs.com/wd/hub';
const EU_REPORTER_REGION = 'eu-central-1';

function buildCapabilities({ platformName, browserName, jobName }) {
  const screenResolution = process.env.SAUCE_SCREEN_RESOLUTION || '1280x960';
  const build = process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local';
  // Playwright on Sauce uses CDP (se:cdp); Sauce exposes it when devTools is true (Chrome + Edge Chromium).
  // Edge was missing devTools → Playwright got no CDP URL → browserType.launch: Cannot read properties of undefined (reading 'startsWith').
  const cdpBrowsers = new Set(['chrome', 'MicrosoftEdge']);
  const devTools = cdpBrowsers.has(browserName);
  return {
    platformName,
    browserName,
    'sauce:options': {
      username: process.env.SAUCE_USERNAME,
      accessKey: process.env.SAUCE_ACCESS_KEY,
      ...(devTools ? { devTools: true } : {}),
      ...(process.env.SAUCE_SELENIUM_VERSION ? { seleniumVersion: process.env.SAUCE_SELENIUM_VERSION } : {}),
      screenResolution,
      name: jobName,
      build,
      tags: ['pcs-frontend', 'crossbrowser', 'playwright', jobName],
    },
  };
}

function main() {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    console.error('Set SAUCE_USERNAME and SAUCE_ACCESS_KEY.');
    process.exit(1);
  }

  const matrixPath = process.env.SAUCE_MATRIX_FILE || join(__dirname, 'sauce-matrix.default.json');
  let data;
  try {
    data = JSON.parse(readFileSync(matrixPath, 'utf8'));
  } catch (e) {
    console.error(`Cannot read matrix: ${matrixPath}`, e);
    process.exit(1);
  }

  const rows = data.matrix;
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('Matrix file must contain a non-empty "matrix" array.');
    process.exit(1);
  }

  const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  // Selenium → Sauce matrix uses --project chrome / MicrosoftEdge; those channels need local browser stubs (not only bundled chromium).
  let install = spawnSync(yarn, ['playwright', 'install', 'chrome', 'msedge'], { stdio: 'inherit', shell: false });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }

  let anyFailed = false;
  const baseJob = process.env.SAUCE_JOB_NAME || 'pcs-frontend-crossbrowser';

  for (const row of rows) {
    const { id, platformName, browserName, playwrightProject } = row;
    if (!id || !platformName || !browserName || !playwrightProject) {
      console.error('Each matrix row needs id, platformName, browserName, playwrightProject:', row);
      anyFailed = true;
      continue;
    }

    const jobName = `${baseJob}-${id}`;
    const cap = buildCapabilities({ platformName, browserName, jobName });
    const env = {
      ...process.env,
      // playwright.config.ts only registers firefox/webkit/MicrosoftEdge projects when this is set (or CI).
      ENABLE_MULTI_BROWSER_PROJECTS: 'true',
      SELENIUM_REMOTE_URL: EU_HUB,
      SELENIUM_REMOTE_CAPABILITIES: JSON.stringify(cap),
      SAUCE_PLAYWRIGHT_REGION: EU_REPORTER_REGION,
      SAUCE_JOB_NAME: jobName,
    };

    const grepTag = process.env.E2E_GREP || '@crossbrowser';

    console.error(
      `\n── Sauce matrix: ${id} (${platformName} ${browserName} → --project ${playwrightProject} --grep ${grepTag}) ──\n`
    );

    const r = spawnSync(
      yarn,
      ['playwright', 'test', '--project', playwrightProject, '--grep', grepTag, '--headed', ...process.argv.slice(2)],
      { stdio: 'inherit', env, shell: false }
    );
    if (r.status !== 0) {
      anyFailed = true;
    }
  }

  spawnSync(yarn, ['allure', 'generate', '--clean'], { stdio: 'inherit', cwd: process.cwd() });
  spawnSync(yarn, ['ts-node', 'src/test/ui/config/clean-attachments.config.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.error('');
  console.error('── Reports ──');
  console.error('  Allure (local):  yarn test:openAllureReport');
  console.error('  Sauce:           https://app.eu-central-1.saucelabs.com/');
  console.error('');

  process.exit(anyFailed ? 1 : 0);
}

main();
