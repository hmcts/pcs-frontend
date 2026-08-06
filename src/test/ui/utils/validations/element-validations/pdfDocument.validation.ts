import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class PdfDocumentValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string, data: validationRecord): Promise<void> {
    const pdfLink = page.getByRole('link', {
      name: data.linkText as string,
    });

    await expect(pdfLink).toBeVisible();

    const href = await pdfLink.getAttribute('href');

    expect(href).toBeTruthy();

    const pdfUrl = new URL(href!, page.url()).toString();

    const cookies = await page.context().cookies();

    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    const response = await page.request.fetch(pdfUrl, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const status = response.status();
    const body = await response.text();

    if (body.includes('Page not found')) {
      throw new Error(
        `Document "${data.linkText}" did not open. The application returned "Page not found" (HTTP ${status}).`
      );
    }

    if (body.includes('You do not have access to this page')) {
      throw new Error(
        `Document "${data.linkText}" did not open. The application returned "You do not have access to this page" (HTTP ${status}).`
      );
    }

    expect(response.ok()).toBeTruthy();
  }
}
