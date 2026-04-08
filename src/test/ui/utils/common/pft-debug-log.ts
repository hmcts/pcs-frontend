import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

export type PftValidationCategory = 'error-messages' | 'page-navigation' | 'page-content';

const categoryLabel: Record<PftValidationCategory, string> = {
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
  'page-content': 'page content',
};

/**
 * When `failed` is true, attaches a failure screenshot to the Playwright report.
 * When `ENABLE_PFT_DEBUG_LOG=true`, prints a `[PFT]` line for every call (pass or fail).
 */
export async function logPftValidationInformation(
  page: Page,
  category: PftValidationCategory,
  pageLabel: string,
  expected: string,
  actual: string,
  failed: boolean,
  navContext?: { from?: string | null; via?: string }
): Promise<void> {
  if (failed) {
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
  const navSuffix =
    category === 'page-navigation' && navContext
      ? ` | nav: from "${navContext.from ? truncateForLog(String(navContext.from), 40) : '?'}" | control: "${navContext.via ? truncateForLog(String(navContext.via), 60) : '?'}"`
      : '';

  console.log(
    `[PFT] ${categoryLabel[category]} | test: ${t} | page: ${p} | url: ${shortUrl(page.url())}${navSuffix} | expected: ${e} | actual: ${a}`
  );
}
