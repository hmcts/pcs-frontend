/**
 * Sauce preExec: remove project Playwright packages so only the Sauce runner's copy is used.
 * Run with: node scripts/sauce-remove-playwright.js (no ts-node on Sauce VM).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  path.join(root, 'node_modules', '@playwright'),
  path.join(root, 'node_modules', 'playwright'),
  path.join(root, 'node_modules', 'playwright-core'),
];

for (const dir of targets) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('Removed', path.relative(root, dir), 'for Sauce runner');
  } catch {
    // ignore
  }
}
