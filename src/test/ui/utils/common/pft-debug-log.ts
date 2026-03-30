import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
  enable_pft_debug_log,
} from '../../../../../playwright.config';

function truncate(s: string, max: number, trim?: boolean): string {
  const t = trim ? s.trim() : s;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export const shortUrl = (u: string, max = 88) => truncate(u, max);
export const truncateForLog = (s: string, max = 800) => truncate(s, max, true);

export type ValidationFailureCategory = 'page-content' | 'error-messages' | 'page-navigation';

const validationEnv: Record<ValidationFailureCategory, string> = {
  'page-content': enable_content_validation,
  'error-messages': enable_error_message_validation,
  'page-navigation': enable_navigation_tests,
};

const validationLabel: Record<ValidationFailureCategory, string> = {
  'page-content': 'page content',
  'error-messages': 'error messages',
  'page-navigation': 'page navigation',
};

async function attachValidationFailureScreenshot(
  page: Page,
  category: ValidationFailureCategory,
  pageLabel: string,
  debugLabel: string
): Promise<void> {
  if (validationEnv[category] !== 'true') {
    return;
  }
  try {
    const safe = (pageLabel.trim() || 'page').slice(0, 80);
    const fileName = `failure-${category}-${safe}-${Date.now()}.png`;
    const out = test.info().outputPath('validation-failures', fileName);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    await test.info().attach(`Validation failure (${debugLabel}): ${safe}`, {
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
  const label = validationLabel[category];
  if (attachScreenshot) {
    await attachValidationFailureScreenshot(page, category, pageLabel, label);
  }
  pftDebugReport({ page, pageLabel, category: label, expected, actual });
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
  const tag = `[PFT check: ${category}]`;
  console.log(
    [
      `${tag} page: ${truncateForLog(pageLabel, 200)}`,
      `${tag} url: ${shortUrl(page.url())}`,
      `${tag} expected: ${truncateForLog(expected)}`,
      `${tag} actual: ${truncateForLog(actual)}`,
    ].join('\n')
  );
}
