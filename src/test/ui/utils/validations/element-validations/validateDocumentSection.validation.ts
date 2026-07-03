import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class ValidateDocumentUnderSectionValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    const sectionCard = page.locator('.govuk-summary-card').filter({
      has: page.locator(`.govuk-summary-card__title:text-is("${data.sectionHeader}")`),
    });
    await expect(sectionCard).toBeVisible();
    const documentLink = sectionCard.getByRole('link', {
      name: data.documentName as string,
    });
    await expect(documentLink).toBeVisible();
    const documentRow = documentLink.locator('..');
    const hint = documentRow.locator('.govuk-hint');
    await expect(hint).toHaveText(`Submitted on ${data.submittedDate}`);
  }
}
