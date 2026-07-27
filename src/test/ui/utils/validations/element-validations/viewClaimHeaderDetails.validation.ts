import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class ViewClaimHeaderDetailsValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      let actual = '';

      if (key === 'Date issued' || key === 'Date submitted') {
        actual =
          (
            await page.locator(`dt:text-is("${key}")`).locator('xpath=following-sibling::dd[1]').textContent()
          )?.trim() ?? '';
      } else {
        actual =
          (await page.locator(`p:has(span:text-is("${key}:"))`).textContent())?.replace(`${key}:`, '').trim() ?? '';
      }

      expect(actual.replace(/\s+/g, ' ')).toBe(String(value).replace(/\s+/g, ' '));
    }
  }
}
