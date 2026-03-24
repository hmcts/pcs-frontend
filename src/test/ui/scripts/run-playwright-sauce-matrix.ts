/**
 * Sauce matrix: EU Selenium hub, SAUCE_MATRIX_FILE or sauce-matrix.default.json (same directory).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EU_HUB = 'https://ondemand.eu-central-1.saucelabs.com/wd/hub';
const EU_REPORTER_REGION = 'eu-central-1';

interface MatrixRow {
  id: string;
  platformName: string;
  browserName: string;
  playwrightProject: string;
}

interface MatrixFile {
  matrix: MatrixRow[];
}

function buildCapabilities(params: { platformName: string; browserName: string; jobName: string }) {
  const { platformName, browserName, jobName } = params;
  const screenResolution = process.env.SAUCE_SCREEN_RESOLUTION || '1280x960';
  const build = process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local';
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

function main(): void {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    console.error('Set SAUCE_USERNAME and SAUCE_ACCESS_KEY.');
    process.exit(1);
  }

  const matrixPath = process.env.SAUCE_MATRIX_FILE || join(__dirname, 'sauce-matrix.default.json');
  let data: MatrixFile;
  try {
    data = JSON.parse(readFileSync(matrixPath, 'utf8')) as MatrixFile;
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
  const install = spawnSync(yarn, ['playwright', 'install', 'chrome', 'msedge'], { stdio: 'inherit', shell: false });
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
      [
        'playwright',
        'test',
        '--config',
        'playwright.sauce.config.ts',
        '--project',
        playwrightProject,
        '--grep',
        grepTag,
        '--headed',
        ...process.argv.slice(2),
      ],
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

  console.error('Allure: yarn test:openAllureReport  ·  Sauce: https://app.eu-central-1.saucelabs.com/');
  process.exit(anyFailed ? 1 : 0);
}

main();
