import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { shortUrl, truncateForLog } from './string.utils';

export type PftValidationKind = 'error-messages' | 'page-content' | 'page-navigation';

const LABEL: Record<PftValidationKind, string> = {
  'error-messages': 'error messages',
  'page-content': 'page content',
  'page-navigation': 'page navigation',
};

/**
 * Failure: screenshot + Allure attach (always when `failed`).
 * Debug: one `[PFT]` line (validation + page + url) when `ENABLE_PFT_DEBUG_LOG=true`.
 */
export async function logPftValidation(
  page: Page,
  kind: PftValidationKind,
  pageName: string,
  failed: boolean
): Promise<void> {
  if (failed) {
    const safe = (pageName.trim() || 'page').slice(0, 80);
    try {
      const out = test.info().outputPath('validation-failures', `failure-${kind}-${safe}-${Date.now()}.png`);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: true });
      await test.info().attach(`Validation failure (${LABEL[kind]}): ${safe}`, {
        path: out,
        contentType: 'image/png',
      });
    } catch (err) {
      console.warn('[PFT] screenshot failed:', err instanceof Error ? err.message : String(err));
    }
  }

  if (process.env.ENABLE_PFT_DEBUG_LOG !== 'true') {
    return;
  }

  console.log(`[PFT] ${LABEL[kind]} | page: ${truncateForLog(pageName, 80)} | url: ${shortUrl(page.url())}`);
}
