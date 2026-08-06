import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class PdfDocumentValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    const pdfLink = page.getByRole('link', {
      name: data.linkText as string,
    });

    console.log('pdf link' +pdfLink);
    await expect(pdfLink).toBeVisible();

    const href = await pdfLink.getAttribute('href');

    expect(href).toBeTruthy();

    const pdfUrl = new URL(href!, page.url());
    const expectedPathPattern = /^\/case\/[^/]+\/view-documents\/[0-9a-fA-F-]{36}$/;

    expect(
      pdfUrl.pathname,
      `Document "${data.linkText}" should link to an internal document route, but got "${pdfUrl.pathname}"`
    ).toMatch(expectedPathPattern);
  }
}
