import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class CheckYourAnswersSummaryRowValidation implements IValidation {
  async validate(
    page: Page,
    validation: string,
    fieldName: string,
    data: validationRecord
  ): Promise<void> {
    const row = page
      .locator('.govuk-summary-list__row')
      .filter({
        has: page.locator('.govuk-summary-list__key', {
          hasText: fieldName,
        }),
      })
      .first();
    await expect(row).toBeVisible();
    if (data.value) {
      await expect(
        row.locator('.govuk-summary-list__value')
      ).toContainText(String(data.value));
    }
    if (data.linkText) {
      await expect(
        row.locator('.govuk-summary-list__actions a')
      ).toContainText(String(data.linkText));
    }
  }
}
