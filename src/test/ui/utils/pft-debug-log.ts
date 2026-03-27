import type { Page } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../playwright.config';

/**
 * Opt-in PFT debug: console lines for page, url, expected, actual (no filesystem paths).
 * Enable with ENABLE_PFT_DEBUG_LOG=true or PFT_DEBUG_LOG=true.
 *
 * Failure screenshots for Allure / CI are attached via `validation-failure-attachment.ts`
 * (`test.info().attach`), stored under each run’s `test-results/<test-output-dir>/validation-failures/...`
 * locally and on Jenkins (same workspace-relative layout when you archive `test-results` or open HTML report).
 */
function isEnabled(): boolean {
  const raw = enable_pft_debug_log || 'false';
  return raw.toLowerCase() === 'true' || raw === '1';
}

/** Truncate long URLs for readable console output */
export function shortUrl(u: string, max = 88): string {
  if (u.length <= max) {
    return u;
  }
  return `${u.slice(0, max - 1)}…`;
}

/** Truncate long labels (e.g. link text) */
export function shortLabel(s: string, max = 56): string {
  if (!s) {
    return '';
  }
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

export function truncateForLog(s: string, max = 800): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

export type PftDebugCategory = 'page content' | 'error messages' | 'page navigation';

/**
 * Prints a single console block when PFT debug is enabled. Does not write screenshots or log paths
 * (avoids misleading absolute paths in Allure/Jenkins). Use `attachValidationFailureScreenshot` for failure PNGs on the test report.
 */
export async function pftDebugReport(options: {
  page: Page;
  pageLabel: string;
  category: PftDebugCategory;
  expected: string;
  actual: string;
}): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  const tag = `[PFT check: ${options.category}]`;
  const block = [
    `${tag} page: ${truncateForLog(options.pageLabel, 200)}`,
    `${tag} url: ${shortUrl(options.page.url())}`,
    `${tag} expected: ${truncateForLog(options.expected)}`,
    `${tag} actual: ${truncateForLog(options.actual)}`,
  ].join('\n');
  console.log(block);
}

export function isPftDebugEnabled(): boolean {
  return isEnabled();
}
