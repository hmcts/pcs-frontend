import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

export type PftValidationCategory = 'error-messages' | 'page-content' | 'page-navigation';

const LABEL: Record<PftValidationCategory, string> = {
  'error-messages': 'error messages',
  'page-content': 'page content',
  'page-navigation': 'page navigation',
};

/** Full-page screenshot and Allure attachment when a PFT validation fails. */
export async function takeValidationFailureScreenshot(
  page: Page,
  category: PftValidationCategory,
  pageName: string
): Promise<void> {
  const safe = (pageName.trim() || 'page').slice(0, 80);
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
