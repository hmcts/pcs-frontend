import * as fs from 'fs/promises';
import * as path from 'path';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
} from '../../../../playwright.config';

export type ValidationFailureKind = 'page-content' | 'error-messages' | 'page-navigation';

function kindEnabled(kind: ValidationFailureKind): boolean {
  switch (kind) {
    case 'page-content':
      return enable_content_validation === 'true';
    case 'error-messages':
      return enable_error_message_validation === 'true';
    case 'page-navigation':
      return enable_navigation_tests === 'true';
    default: {
      return kind;
    }
  }
}

function folderForKind(kind: ValidationFailureKind): string {
  switch (kind) {
    case 'page-content':
      return 'pagecontentvalidation';
    case 'error-messages':
      return 'pageerrorvalidation';
    case 'page-navigation':
      return 'pagenavigation';
    default: {
      return kind;
    }
  }
}

function filenameSafe(label: string): string {
  const raw = label.trim() || 'page';
  const safe = raw
    .replace(/^https?:\/\//i, '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (safe.slice(0, 80) || 'page').replace(/\.+/g, '.');
}

/**
 * Saves a full-page screenshot and attaches it to the Playwright test report (Allure, HTML, etc.).
 * Independent of PFT debug logging; gated only by the same env flags as each validation type.
 */
export async function attachValidationFailureScreenshot(
  page: Page,
  kind: ValidationFailureKind,
  pageLabel: string
): Promise<void> {
  if (!kindEnabled(kind)) {
    return;
  }
  try {
    const folder = folderForKind(kind);
    const fileName = `failure-${filenameSafe(pageLabel)}-${Date.now()}.png`;
    const out = test.info().outputPath('validation-failures', folder, fileName);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    const attachName = `Validation failure (${folder}): ${filenameSafe(pageLabel)}`;
    await test.info().attach(attachName, {
      path: out,
      contentType: 'image/png',
    });
  } catch {
    // Avoid masking validation errors if attachment fails
  }
}
