import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

// PFT: optional console when ENABLE_PFT_DEBUG_LOG; screenshots always on failure paths.

function isSensitiveEnvKey(key: string): boolean {
  const u = key.toUpperCase();
  return (
    u.includes('TOKEN') ||
    u.includes('PASSWORD') ||
    u.includes('SECRET') ||
    u.includes('CREDENTIAL')
  );
}

function formatEnvLineForLog(key: string): string {
  if (isSensitiveEnvKey(key)) {
    return `  ${key}=<redacted>`;
  }
  return `  ${key}=${process.env[key]}`;
}

let envBeforeBeforeEach: NodeJS.ProcessEnv | null = null;

export function captureProcessEnvBeforeBeforeEach(): void {
  envBeforeBeforeEach = { ...process.env };
}

export function logTestBeforeEachContext(): void {
  if (enable_pft_debug_log !== 'true') {
    return;
  }

  const before = envBeforeBeforeEach;
  const changed = before
    ? Object.keys(process.env)
        .filter(k => {
          const v = process.env[k];
          return v !== undefined && v !== '' && before[k] !== v;
        })
        .sort()
    : [];

  const lines = changed.map(formatEnvLineForLog);
  const body =
    lines.length > 0
      ? lines.join('\n')
      : before
        ? '  (no process.env keys were added or changed during this beforeEach)'
        : '  (call captureProcessEnvBeforeBeforeEach() at the start of beforeEach to log env changes)';

  const { title } = test.info();
  console.log(['[PFT debug: beforeEach context]', `  test: ${truncateForLog(title, 200)}`, body].join('\n'));
}

export type ValidationFailureCategory = 'page-content' | 'error-messages' | 'page-navigation';

const categoryLabel: Record<ValidationFailureCategory, string> = {
  'page-content': 'page content',
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
};

export async function attachValidationFailureScreenshot(
  page: Page,
  category: ValidationFailureCategory,
  pageLabel: string
): Promise<void> {
  const label = categoryLabel[category];
  try {
    const safe = (pageLabel.trim() || 'page').slice(0, 80);
    const out = test.info().outputPath('validation-failures', `failure-${category}-${safe}-${Date.now()}.png`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    await test.info().attach(`Validation failure (${label}): ${safe}`, {
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
  if (attachScreenshot) {
    await attachValidationFailureScreenshot(page, category, pageLabel);
  }
  pftDebugReport({
    page,
    pageLabel,
    category: categoryLabel[category],
    expected,
    actual,
  });
}

function formatPftCheck(page: Page, pageLabel: string, category: string, expected: string, actual: string): string {
  const tag = `[PFT check: ${category}]`;
  const testTitle = test.info().title;
  return [
    `${tag} test: ${truncateForLog(testTitle, 200)}`,
    `${tag} page: ${truncateForLog(pageLabel, 200)}`,
    `${tag} url: ${shortUrl(page.url())}`,
    `${tag} expected: ${truncateForLog(expected)}`,
    `${tag} actual: ${truncateForLog(actual)}`,
  ].join('\n');
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
  console.log(formatPftCheck(page, pageLabel, category, expected, actual));
}

const UNMAPPED_EXPECTED = 'A matching key in urlToFileMapping.config.ts';
const UNMAPPED_ACTUAL = 'No matching key — PFT skipped';

export function logUnmappedPftUrl(page: Page, pageLabel: string): void {
  console.log(formatPftCheck(page, pageLabel, 'page functional tests', UNMAPPED_EXPECTED, UNMAPPED_ACTUAL));
}
