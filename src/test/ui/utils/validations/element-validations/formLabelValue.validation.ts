import { Locator, Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { IValidation, validationRecord } from '../../interfaces';

export class FormLabelValueValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data?: validationRecord): Promise<void> {
    const valueLocator = await this.findFieldValueLocator(page, fieldName);

    if (data?.value !== undefined) {
      await expect(valueLocator).toHaveText(new RegExp(`^${escapeForRegex(String(data.value))}$`));
    } else {
      const value = await valueLocator.textContent();
      if (!value?.trim()) {
        throw new Error(`Value for "${fieldName}" is empty`);
      }
    }
  }

  private async findFieldValueLocator(page: Page, fieldName: string): Promise<Locator> {
    const locators = [
      page
        .locator(`.case-viewer-label:text-is("${fieldName}")`)
        .locator('xpath=../following-sibling::td[1]')
        .locator('.text-16 span'),

      page
        .locator(`th#complex-panel-simple-field-label > span.text-16:text-is("${fieldName}")`)
        .locator('xpath=../..')
        .locator('td span.text-16:not(:has(ccd-field-read-label))'),
    ];

    for (const locator of locators) {
      if ((await locator.count()) === 1) {
        await expect(locator).toBeVisible();
        return locator;
      }
    }
    throw new Error(`Field "${fieldName}" not found`);
  }
}
