import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class PdfDocumentValidation implements IValidation {
  async validate(page: Page, _validation: string, _fieldName: string, data: validationRecord): Promise<void> {
    const pdfLink = page.getByRole('link', {
      name: data.linkText as string,
    });

    await expect(pdfLink).toBeVisible();

    const href = await pdfLink.getAttribute('href');
    expect(href).toBeTruthy();

    const documentUrl = new URL(href!, page.url()).toString();

    const cookieHeader = (await page.context().cookies()).map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    let lastStatus = 0;
    let lastBody = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await page.request.fetch(documentUrl, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      lastStatus = response.status();
      lastBody = await response.text();

      if (
        response.ok() &&
        !lastBody.includes('Page not found') &&
        !lastBody.includes('You do not have access to this page')
      ) {
        return;
      }

      if (lastBody.includes('You do not have access to this page')) {
        throw new Error(
          `Document "${data.linkText}" could not be opened because access was denied (HTTP ${lastStatus}).`
        );
      }

      const shouldRetry =
        attempt < 3 && (lastBody.includes('Page not found') || lastStatus === 404 || lastStatus >= 500);

      if (shouldRetry) {
        await page.waitForTimeout(2000);
        continue;
      }

      break;
    }

    if (lastBody.includes('Page not found')) {
      throw new Error(
        `Document "${data.linkText}" could not be opened because the application returned "Page not found" after 3 attempts (HTTP ${lastStatus}).`
      );
    }

    throw new Error(`Failed to open document "${data.linkText}" (HTTP ${lastStatus}).`);
  }
}
