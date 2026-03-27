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

/** Output subfolder under `pft-debug/` for screenshots */
function pftDebugFolderForCategory(category: PftDebugCategory): string {
  switch (category) {
    case 'page content':
      return 'pagecontentvalidation';
    case 'error messages':
      return 'pageerrorvalidation';
    case 'page navigation':
      return 'pagenavigation';
    default: {
      return category;
    }
  }
}

/** Strip characters unsafe or awkward in filenames; keep readable page identifiers */
function filenameSafePageLabel(label: string): string {
  const raw = label.trim() || 'page';
  const safe = raw
    .replace(/^https?:\/\//i, '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const truncated = safe.slice(0, 80);
  return truncated || 'page';
}

/**
 * Writes a screenshot under this test's output dir, e.g.
 * `test-results/.../pft-debug/pagecontentvalidation/`, `.../pageerrorvalidation/`, `.../pagenavigation/`.
 * Also prints page, check type, expected, actual, and screenshot path.
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
  let screenshotPath: string;
  try {
    const folder = pftDebugFolderForCategory(options.category);
    const fileName = `pft-${filenameSafePageLabel(options.pageLabel)}-${Date.now()}.png`;
    const out = test.info().outputPath('pft-debug', folder, fileName);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await options.page.screenshot({ path: out, fullPage: true });
    screenshotPath = out;
  } catch {
    screenshotPath = '(screenshot failed)';
  }

  // One write so Playwright’s list reporter cannot interleave nested test.step() lines between PFT lines.
  const tag = `[PFT check: ${options.category}]`;
  const block = [
    `${tag} page: ${truncateForLog(options.pageLabel, 200)}`,
    `${tag} url: ${shortUrl(options.page.url())}`,
    `${tag} expected: ${truncateForLog(options.expected)}`,
    `${tag} actual: ${truncateForLog(options.actual)}`,
    `${tag} screenshot: ${screenshotPath}`,
  ].join('\n');
  console.log(block);
}

export function isPftDebugEnabled(): boolean {
  return isEnabled();
}
