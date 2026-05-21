import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class ValidateDocumentUnderSectionValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    const sectionCard = page.locator('.govuk-summary-card').filter({
      has: page.locator(`.govuk-summary-card__title:text-is("${data.sectionHeader}")`),
    });
    await expect(sectionCard).toBeVisible();
    await expect(sectionCard.locator(`a.govuk-link:text-is("${data.documentName}")`)).toBeVisible();
    await expect(sectionCard.locator(`.govuk-hint:text-is("Submitted on ${data.submittedDate}")`)).toBeVisible();
  }
}
