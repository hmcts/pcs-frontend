import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

export async function takeValidationFailureScreenshot(
  page: Page,
  category: 'error-messages' | 'page-content' | 'page-navigation',
  pageName: string
): Promise<void> {
  const body = await page.screenshot({ fullPage: true });
  await test.info().attach(
    `Validation failure (${category.replace(/-/g, ' ')}): ${(pageName.trim() || 'page').slice(0, 80)}`,
    { body, contentType: 'image/png' }
  );
}
