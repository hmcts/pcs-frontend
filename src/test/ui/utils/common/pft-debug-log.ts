import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

function isSensitiveEnvKey(key: string): boolean {
  const u = key.toUpperCase();
  return u.includes('TOKEN') || u.includes('PASSWORD') || u.includes('SECRET') || u.includes('CREDENTIAL');
}

function formatEnvLine(key: string): string {
  if (isSensitiveEnvKey(key)) {
    return `  ${key}=<redacted>`;
  }
  const v = process.env[key];
  return `  ${key}=${v === undefined || v === '' ? '<unset>' : v}`;
}

/**
 * Printed by {@link logTestBeforeEachContext} when `ENABLE_PFT_DEBUG_LOG=true`.
 * Add a key here when tests introduce or rely on a new `process.env` scenario variable.
 */
export const PFT_DEBUG_DISPLAY_ENV_KEYS: readonly string[] = [
  'TEST_URL',
  'CASE_NUMBER',
  'CASE_FID',
  'CLAIMANT_NAME',
  'CLAIMANT_NAME_OVERRIDDEN',
  'NOTICE_SERVED',
  'NOTICE_DATE_PROVIDED',
  'TENANCY_TYPE',
  'GROUNDS',
  'NOTICE_DETAILS_NO_NOTSURE',
  'TENANCY_START_DATE_KNOWN',
  'RENT_NON_RENT',
  'CORRESPONDENCE_ADDRESS',
  'WALES_POSTCODE',
  'REPAYMENTS_AGREED',
  'CONTACT_PREFERENCES_TELEPHONE',
  'PCS_API_CHANGE_ID',
];

export function logTestBeforeEachContext(): void {
  if (enable_pft_debug_log !== 'true') {
    return;
  }

  const title = truncateForLog(test.info().title, 200);
  const lines = PFT_DEBUG_DISPLAY_ENV_KEYS.map(key => formatEnvLine(key));
  console.log(`[PFT debug: env]\n  test: ${title}\n${lines.join('\n')}`);
}

export type ValidationFailureCategory = 'page-content' | 'error-messages' | 'page-navigation';

const categoryLabel: Record<ValidationFailureCategory, string> = {
  'page-content': 'page content',
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
};

export async function reportValidationFailure(
  page: Page,
  category: ValidationFailureCategory,
  pageLabel: string,
  expected: string,
  actual: string,
  attachScreenshot: boolean
): Promise<void> {
  if (attachScreenshot) {
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

  if (enable_pft_debug_log !== 'true') {
    return;
  }

  console.log(
    linesForPftCheck(page, pageLabel, categoryLabel[category], expected, actual).join('\n')
  );
}

function linesForPftCheck(
  page: Page,
  pageLabel: string,
  category: string,
  expected: string,
  actual: string
): string[] {
  const tag = `[PFT check: ${category}]`;
  const testTitle = truncateForLog(test.info().title, 200);
  return [
    `${tag} test: ${testTitle}`,
    `${tag} page: ${truncateForLog(pageLabel, 200)}`,
    `${tag} url: ${shortUrl(page.url())}`,
    `${tag} expected: ${truncateForLog(expected)}`,
    `${tag} actual: ${truncateForLog(actual)}`,
  ];
}

const UNMAPPED_EXPECTED = 'A matching key in urlToFileMapping.config.ts';
const UNMAPPED_ACTUAL = 'No matching key — PFT skipped';

/** Always logs — unmapped URLs need to be visible even when ENABLE_PFT_DEBUG_LOG is off. */
export function logUnmappedPftUrl(page: Page, pageLabel: string): void {
  console.log(
    linesForPftCheck(page, pageLabel, 'page functional tests', UNMAPPED_EXPECTED, UNMAPPED_ACTUAL).join('\n')
  );
}
