import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class ErrorMessageValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, error: string | validationRecord): Promise<void> {
    let errorMessage;
    if (typeof error === 'string') {
      errorMessage = page.locator(`a.validation-error:has-text("${error}")`);
    } else {
      errorMessage = page.locator(`
        h2.govuk-error-summary__title:has-text("${error.header}") + p:has-text("${error.message}"),
        h2.govuk-error-summary__title:has-text("${error.header}") ~ div>ul>li:has-text("${error.message}")
      `);
    }
    await expect(errorMessage).toBeVisible();
  }
}
