import { Locator, Page, expect } from '@playwright/test';

import { IValidation, validationData } from '../../interfaces';

export class InputErrorValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationData): Promise<void> {
    const valueLocator = await this.findFieldValueLocator(page, fieldName, data);
    if (data !== undefined) {
      await expect(valueLocator).toContainText(String(data));
    } else {
      const value = await valueLocator.textContent();
      if (!value?.trim()) {
        throw new Error(`Value for "${fieldName}" is empty`);
      }
    }
  }

  private async findFieldValueLocator(page: Page, fieldName: string, data: validationData): Promise<Locator> {
    const locator = page.locator(`
      :is(
        .govuk-form-group:has(label:has-text("${fieldName}")),
        fieldset:has(legend:has-text("${fieldName}"))
      ) p.govuk-error-message:has-text("${data}")
    `);
    const count = await locator.count();
    if (count === 0) {
      throw new Error(`The error message "${data}" for field "${fieldName}" is not triggered`);
    }
    return locator.first();
  }
}
