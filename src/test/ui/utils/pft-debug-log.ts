import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../playwright.config';

/**
 * Opt-in PFT debug: page label, check type, expected vs actual, and a screenshot.
 * Enable with ENABLE_PFT_DEBUG_LOG=true or PFT_DEBUG_LOG=true.
 */
function isEnabled(): boolean {
  const raw = enable_pft_debug_log || 'false';
  return raw.toLowerCase() === 'true' || raw === '1';
}

/** Truncate long URLs for readable console output */
export function shortUrl(u: string, max = 88): string {
  if (u.length <= max) return u;
  return `${u.slice(0, max - 1)}…`;
}

/** Truncate long labels (e.g. link text) */
export function shortLabel(s: string, max = 56): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function truncateForLog(s: string, max = 800): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type PftDebugCategory = 'page content' | 'error messages' | 'page navigation';

function slug(category: PftDebugCategory): string {
  return category.replace(/\s+/g, '-');
}

/**
 * Writes a screenshot under this test's output dir (`test-results/.../pft-debug/`) and prints
 * page, check type, expected, actual, and screenshot path.
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

  let screenshotPath = '';
  try {
    const fileName = `pft-${slug(options.category)}-${Date.now()}.png`;
    const out = test.info().outputPath('pft-debug', fileName);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await options.page.screenshot({ path: out, fullPage: true });
    screenshotPath = out;
  } catch {
    screenshotPath = '(screenshot failed)';
  }

  console.log(`[PFT] page: ${truncateForLog(options.pageLabel, 200)}`);
  console.log(`[PFT] url: ${shortUrl(options.page.url())}`);
  console.log(`[PFT check: ${options.category}]`);
  console.log(`[PFT] expected: ${truncateForLog(options.expected)}`);
  console.log(`[PFT] actual: ${truncateForLog(options.actual)}`);
  console.log(`[PFT] screenshot: ${screenshotPath}`);
}

export function isPftDebugEnabled(): boolean {
  return isEnabled();
}
