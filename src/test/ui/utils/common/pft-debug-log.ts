import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

export type ValidationFailureCategory = 'page-content' | 'error-messages' | 'page-navigation';

const categoryLabel: Record<ValidationFailureCategory, string> = {
  'page-content': 'page content',
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
};

/**
 * When a functional validation fails: attaches a screenshot to the Playwright report.
 * When `enable_pft_debug_log` is true (`ENABLE_PFT_DEBUG_LOG=true` in env), also prints one line to the console.
 */
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
      console.warn('[PFT] screenshot failed:', err instanceof Error ? err.message : String(err));
    }
  }

  if (enable_pft_debug_log !== 'true') {
    return;
  }

  const t = truncateForLog(test.info().title, 120);
  const p = truncateForLog(pageLabel, 80);
  const e = truncateForLog(expected, 160);
  const a = truncateForLog(actual, 160);
  console.log(
    `[PFT] ${categoryLabel[category]} | test: ${t} | page: ${p} | url: ${shortUrl(page.url())} | expected: ${e} | actual: ${a}`
  );
}
