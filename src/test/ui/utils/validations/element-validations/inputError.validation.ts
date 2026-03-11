import { Locator, Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { IValidation, validationData } from '../../interfaces';

export class InputErrorValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationData): Promise<void> {
    const valueLocator = await this.findFieldValueLocator(page, fieldName, data);
    if (data !== undefined) {
      await expect(valueLocator).toHaveText(
        new RegExp('^\\s*(?:Error:\\s*)?' + escapeForRegex(String(data)) + '\\s*$')
      );
    } else {
      const value = await valueLocator.textContent();
      if (!value?.trim()) {
        throw new Error('Value for "' + fieldName + '" is empty');
      }
    }
  }

  private async findFieldValueLocator(page: Page, fieldName: string, data: validationData): Promise<Locator> {
    const escapedData = String(data).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const selector =
      ':is(.govuk-form-group:has(label:text-is("' +
      fieldName +
      '")),fieldset:has(legend:text-is("' +
      fieldName +
      '")) ) p.govuk-error-message:has-text("' +
      escapedData +
      '")';
    const locator = page.locator(selector);
    if ((await locator.count()) === 0) {
      throw new Error('The error message "' + data + '" for field "' + fieldName + '" is not triggered');
    }
    return locator.first();
  }
}
