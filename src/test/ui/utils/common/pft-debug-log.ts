import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

export type PftValidationCategory = 'error-messages' | 'page-navigation' | 'page-content';

/** Set when `category` is `page-navigation` — who we navigated from, how, and landing page name. */
export type PftNavigationLogContext = {
  sourcePage: string;
  action: string;
  destinationPageName: string;
};

const LABEL: Record<PftValidationCategory, string> = {
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
  'page-content': 'page content',
};

/** Screenshot on failure; optional `[PFT]` line when `ENABLE_PFT_DEBUG_LOG=true`. */
export async function logPftValidationInformation(
  page: Page,
  category: PftValidationCategory,
  pageLabel: string,
  expected: string,
  actual: string,
  failed: boolean,
  navigationContext?: PftNavigationLogContext
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

  const p = truncateForLog(pageLabel, 80);
  const u = shortUrl(page.url());
  let prefix: string;
  if (category === 'error-messages') {
    prefix = `[PFT] error messages validation for page: ${p} | url: ${u}`;
  } else if (category === 'page-navigation' && navigationContext) {
    const src = truncateForLog(navigationContext.sourcePage, 80);
    const act = truncateForLog(navigationContext.action, 80);
    const dest = truncateForLog(navigationContext.destinationPageName, 80);
    prefix = `[PFT] page navigation validation | from page: ${src} | action: "${act}" | destination page: ${dest} | url: ${u}`;
  } else {
    prefix = `[PFT] ${LABEL[category]} | page: ${p} | url: ${u}`;
  }
  if (category === 'page-content' && !expected.trim() && !actual.trim()) {
    console.log(prefix);
    return;
  }

  console.log(`${prefix} | expected: ${truncateForLog(expected, 160)} | actual: ${truncateForLog(actual, 160)}`);
}
