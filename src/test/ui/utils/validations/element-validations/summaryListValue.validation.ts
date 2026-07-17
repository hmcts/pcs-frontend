import { Locator, Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { IValidation, validationRecord } from '../../interfaces';

export class SummaryListValueValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data?: validationRecord): Promise<void> {
    const valueLocator = await this.findFieldValueLocator(page, fieldName);

    if (data?.value !== undefined) {
      await expect(valueLocator).toHaveText(new RegExp(`^\\s*${escapeForRegex(String(data.value))}\\s*$`));
      return;
    }

    const value = await valueLocator.textContent();
    if (!value?.trim()) {
      throw new Error(`Value for "${fieldName}" is empty`);
    }
  }

  private async findFieldValueLocator(page: Page, fieldName: string): Promise<Locator> {
    const dtLocator = page.locator('.govuk-summary-list__key, dt').filter({ hasText: fieldName }).first();
    if ((await dtLocator.count()) > 0) {
      const locator = dtLocator.locator('xpath=following-sibling::dd[1]');
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    }
    throw new Error(`Field "${fieldName}" not found`);
  }
}
