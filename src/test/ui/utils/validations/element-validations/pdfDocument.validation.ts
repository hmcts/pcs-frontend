import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class PdfDocumentValidation implements IValidation {
  async validate(page: Page, _validation: string, _fieldName: string, data: validationRecord): Promise<void> {
    const pdfLink = page.getByRole('link', {
      name: data.linkText as string,
    });

    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute('href', /\/case\/[^/]+\/view-documents\/[0-9a-fA-F-]{36}/);
  }
}
