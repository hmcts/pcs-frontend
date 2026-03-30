import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

/** Summary / diagnostic `console.log` lines — only when `ENABLE_PFT_DEBUG_LOG=true`. */
export function pftDebugLog(...args: unknown[]): void {
  if (enable_pft_debug_log !== 'true') {
    return;
  }
  console.log(...args);
}

/**
 * Console output:
 * - **`pftDebugLog` / `logTestBeforeEachContext`**: only when `ENABLE_PFT_DEBUG_LOG=true`.
 * - **`pftDebugReport`** (`[PFT check: …]`): only when `ENABLE_PFT_DEBUG_LOG=true`.
 * Failure PNGs: `test.info().attach` from `attachValidationFailureScreenshot` and from
 * `reportValidationFailure(..., attachScreenshot: true)` — **not** gated by the flag
 * (Allure / HTML report attachments).
 */

/**
 * Shallow snapshot of `process.env` at the **start** of `test.beforeEach` (before any assignments).
 * Used by `logTestBeforeEachContext()` to log only keys **added or changed** during that hook.
 */
let envSnapshotBeforeBeforeEach: NodeJS.ProcessEnv | null = null;

/**
 * Call as the **first** line of `test.beforeEach` (before `initializeExecutor` / any `process.env` writes).
 * Pairs with `logTestBeforeEachContext()` at the end of the same hook.
 */
export function captureProcessEnvBeforeBeforeEach(): void {
  envSnapshotBeforeBeforeEach = { ...process.env };
}

function envKeysChangedDuringBeforeEach(): string[] {
  const before = envSnapshotBeforeBeforeEach;
  if (!before) {
    return [];
  }
  const keys: string[] = [];
  for (const k of Object.keys(process.env)) {
    const v = process.env[k];
    if (v === undefined || v === '') {
      continue;
    }
    if (before[k] !== v) {
      keys.push(k);
    }
  }
  return keys.sort();
}

/**
 * Call at the **end** of `test.beforeEach` (after `process.env` / case creation is done).
 * Prints one block only when `ENABLE_PFT_DEBUG_LOG=true`.
 * Logs every **non-empty** `process.env` key whose value **differs** from the snapshot taken by
 * `captureProcessEnvBeforeBeforeEach()` at the start of this `beforeEach`.
 */
export function logTestBeforeEachContext(): void {
  const { title } = test.info();
  const changedKeys = envKeysChangedDuringBeforeEach();
  const lines = changedKeys.map(key => `  ${key}=${process.env[key]}`);
  const body =
    lines.length > 0
      ? lines.join('\n')
      : envSnapshotBeforeBeforeEach
        ? '  (no process.env keys were added or changed during this beforeEach)'
        : '  (call captureProcessEnvBeforeBeforeEach() at the start of beforeEach to log env changes)';
  pftDebugLog(['[PFT debug: beforeEach context]', `  test: ${truncateForLog(title, 200)}`, body].join('\n'));
}

function truncate(s: string, max: number, trim?: boolean): string {
  const t = trim ? s.trim() : s;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export const shortUrl = (u: string, max = 88) => truncate(u, max);
export const truncateForLog = (s: string, max = 800) => truncate(s, max, true);

export type ValidationFailureCategory = 'page-content' | 'error-messages' | 'page-navigation';

const validationLabel: Record<ValidationFailureCategory, string> = {
  'page-content': 'page content',
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
};

/**
 * Full-page screenshot attached to the test report (Allure / HTML). Not gated by `ENABLE_PFT_DEBUG_LOG`.
 */
export async function attachValidationFailureScreenshot(
  page: Page,
  category: ValidationFailureCategory,
  pageLabel: string
): Promise<void> {
  const debugLabel = validationLabel[category];
  try {
    const safe = (pageLabel.trim() || 'page').slice(0, 80);
    const fileName = `failure-${category}-${safe}-${Date.now()}.png`;
    const out = test.info().outputPath('validation-failures', fileName);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    await test.info().attach(`Validation failure (${debugLabel}): ${safe}`, {
      path: out,
      contentType: 'image/png',
    });
  } catch (err) {
    console.warn(
      `[pft-debug-log] screenshot (${category}, ${pageLabel}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function reportValidationFailure(
  page: Page,
  category: ValidationFailureCategory,
  pageLabel: string,
  expected: string,
  actual: string,
  attachScreenshot: boolean
): Promise<void> {
  const label = validationLabel[category];
  if (attachScreenshot) {
    await attachValidationFailureScreenshot(page, category, pageLabel);
  }
  pftDebugReport({ page, pageLabel, category: label, expected, actual });
}

export function pftDebugReport(options: {
  page: Page;
  pageLabel: string;
  category: string;
  expected: string;
  actual: string;
}): void {
  if (enable_pft_debug_log !== 'true') {
    return;
  }
  const { page, pageLabel, category, expected, actual } = options;
  const tag = `[PFT check: ${category}]`;
  const testTitle = test.info().title;
  console.log(
    [
      `${tag} test: ${truncateForLog(testTitle, 200)}`,
      `${tag} page: ${truncateForLog(pageLabel, 200)}`,
      `${tag} url: ${shortUrl(page.url())}`,
      `${tag} expected: ${truncateForLog(expected)}`,
      `${tag} actual: ${truncateForLog(actual)}`,
    ].join('\n')
  );
}
