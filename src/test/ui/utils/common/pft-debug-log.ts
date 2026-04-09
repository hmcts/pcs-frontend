import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { enable_pft_debug_log } from '../../../../../playwright.config';

import { shortUrl, truncateForLog } from './string.utils';

export type PftValidationCategory = 'error-messages' | 'page-navigation' | 'page-content';

export type PftNavigationLogContext = {
  sourcePage: string;
  sourceUrl: string;
  actionKind: 'clickLink' | 'clickButton';
  actionName: string;
  destinationPageName: string;
};

const LABEL: Record<PftValidationCategory, string> = {
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
  'page-content': 'page content validation',
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

  const landing = shortUrl(page.url());
  let prefix: string;
  if (category === 'error-messages') {
    prefix = `[PFT] error messages validation | page: ${truncateForLog(pageLabel, 80)} | url: ${landing}`;
  } else if (category === 'page-navigation' && navigationContext) {
    const c = navigationContext;
    prefix = `[PFT] page navigation validation | from page: ${truncateForLog(c.sourcePage, 80)} | url: ${shortUrl(c.sourceUrl || '')} | action: ${c.actionKind} | name: "${truncateForLog(c.actionName, 80)}" | destination page: ${truncateForLog(c.destinationPageName, 80)} | landing url: ${landing}`;
  } else {
    prefix = `[PFT] ${LABEL[category]} | page: ${truncateForLog(pageLabel, 80)} | url: ${landing}`;
  }
  if (category === 'page-content' && !expected.trim() && !actual.trim()) {
    console.log(prefix);
    return;
  }

  console.log(`${prefix} | expected: ${truncateForLog(expected, 160)} | actual: ${truncateForLog(actual, 160)}`);
}
