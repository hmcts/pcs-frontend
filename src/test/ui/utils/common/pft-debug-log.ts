import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

export type PftValidationCategory = 'error-messages' | 'page-content' | 'page-navigation';

const LABEL: Record<PftValidationCategory, string> = {
  'error-messages': 'error messages',
  'page-content': 'page content',
  'page-navigation': 'page navigation',
};

/** Screenshots on failure; optional `[PFT]` line when `enable_pft_debug_log` is `'true'`. */
export async function logPftValidationInformation(
  page: Page,
  category: PftValidationCategory,
  pageLabel: string,
  expected: string,
  actual: string,
  failed: boolean
): Promise<void> {
  if (failed) {
    const safe = (pageLabel.trim() || 'page').slice(0, 80);
    try {
      const out = test.info().outputPath('validation-failures', `failure-${category}-${safe}-${Date.now()}.png`);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: true });
      await test.info().attach(`Validation failure (${LABEL[category]}): ${safe}`, {
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

  const base = `[PFT] ${LABEL[category]} | page: ${truncateForLog(pageLabel, 80)} | url: ${shortUrl(page.url())}`;
  if (category === 'page-content' && !failed && !expected.trim() && !actual.trim()) {
    console.log(base);
    return;
  }
  console.log(`${base} | expected: ${truncateForLog(expected, 160)} | actual: ${truncateForLog(actual, 160)}`);
}
