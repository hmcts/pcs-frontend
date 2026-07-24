import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class ValidatePdfDocumentValidation implements IValidation {
  async validate(page: Page, _validation: string, _fieldName: string, data: validationRecord): Promise<void> {
    const linkText = String(data.linkText);
    const expectedHeader = String(data.header ?? '');
    const link = page.locator(`a:text-is("${linkText}")`);
    await link.waitFor({ state: 'visible' });
    const [newPage] = await Promise.all([page.waitForEvent('popup'), link.click()]);
    await newPage.waitForLoadState('domcontentloaded');
    const pageTitle = await newPage.title();
    expect(pageTitle).toContain(expectedHeader);
    await newPage.close();
  }
}
