#!/usr/bin/env node
/**
 * Installs Playwright browsers only when they are actually missing.
 *
 * Why: several package.json test scripts (test:smoke, test:functional,
 * test:fullfunctional, test:changed, test:E2e) each began with an
 * unconditional `yarn playwright install`. In CI the smoke stage and the
 * functional stage run back-to-back on the same agent, so the browser bundle
 * was downloaded and unpacked twice per build even though the first stage had
 * already populated the cache.
 *
 * This script performs the cheap check Playwright itself uses -- an
 * `INSTALLATION_COMPLETE` marker inside each browser's versioned cache
 * directory -- and only shells out to `playwright install` when something is
 * absent. A developer on a clean machine still gets a full install; a second
 * consecutive invocation is a sub-second no-op.
 *
 * Any uncertainty (unknown cache layout, unreadable registry, PLAYWRIGHT_BROWSERS_PATH=0)
 * deliberately falls through to running the real installer, so the failure mode
 * is "install again" and never "run tests without browsers".
 *
 * Usage: node bin/ensure-playwright-browsers.js [extra playwright install args]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const extraArgs = process.argv.slice(2);

function runInstall(reason) {
  console.log(`[ensure-playwright-browsers] ${reason} -> running 'playwright install'`);
  const result = spawnSync('yarn', ['playwright', 'install', ...extraArgs], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`[ensure-playwright-browsers] failed to launch installer: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

// This guard only reasons about the install-by-default browser set. If the
// caller named specific browsers or passed flags (e.g. `msedge`, `--with-deps`),
// hand straight over to the real installer rather than risk skipping them.
if (extraArgs.length > 0) {
  runInstall(`explicit arguments given (${extraArgs.join(' ')})`);
}

// A browsers path of "0" means "install inside node_modules"; the cache layout
// differs, so don't try to reason about it -- just delegate.
if (process.env.PLAYWRIGHT_BROWSERS_PATH === '0') {
  runInstall('PLAYWRIGHT_BROWSERS_PATH=0 (node_modules-local install)');
}

// Resolve the browsers Playwright would install by default, from the registry
// that ships with the pinned playwright-core.
let defaultBrowsers;
try {
  const coreDir = path.dirname(require.resolve('playwright-core/package.json'));
  const registry = JSON.parse(fs.readFileSync(path.join(coreDir, 'browsers.json'), 'utf8'));
  defaultBrowsers = registry.browsers.filter(b => b.installByDefault);
} catch (err) {
  runInstall(`could not read playwright-core browsers registry (${err.message})`);
}

if (!defaultBrowsers || defaultBrowsers.length === 0) {
  runInstall('browsers registry listed no default browsers');
}

// Derive the cache root from Playwright's own path resolution rather than
// re-implementing the per-platform default, so PLAYWRIGHT_BROWSERS_PATH and any
// future layout change are honoured automatically. executablePath() returns
// something like <root>/chromium-1234/chrome-linux64/chrome; walk up until the
// directory name matches the expected "<name>-<revision>" for chromium.
function findCacheRoot() {
  let executable;
  try {
    executable = require('playwright-core').chromium.executablePath();
  } catch (err) {
    return { error: `chromium.executablePath() failed (${err.message})` };
  }
  const chromium = defaultBrowsers.find(b => b.name === 'chromium');
  if (!chromium) {
    return { error: 'chromium missing from the default browsers registry' };
  }
  const expectedDir = `chromium-${chromium.revision}`;
  let dir = path.dirname(executable);
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === expectedDir) {
      return { root: path.dirname(dir) };
    }
    dir = path.dirname(dir);
  }
  return { error: `could not locate '${expectedDir}' within ${executable}` };
}

const { root, error } = findCacheRoot();
if (error) {
  runInstall(`unrecognised browser cache layout: ${error}`);
}

// Playwright writes INSTALLATION_COMPLETE last, so its presence means the
// unpack finished rather than being interrupted half-way.
const missing = defaultBrowsers
  .map(browser => ({
    browser,
    dir: path.join(root, `${browser.name.replace(/-/g, '_')}-${browser.revision}`),
  }))
  .filter(({ dir }) => !fs.existsSync(path.join(dir, 'INSTALLATION_COMPLETE')))
  .map(({ browser }) => `${browser.name} v${browser.revision}`);

if (missing.length > 0) {
  runInstall(`missing browsers in ${root}: ${missing.join(', ')}`);
}

console.log(
  `[ensure-playwright-browsers] all ${defaultBrowsers.length} default browsers already installed in ${root} -- skipping download`
);
