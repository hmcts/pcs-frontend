/**
 * Sauce preExec: remove project Playwright packages so only the Sauce runner's copy is used.
 * Run after `npm install` via: npx ts-node --transpile-only ./scripts/sauce-remove-playwright.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

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
