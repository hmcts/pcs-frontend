import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class viewClaimOrResponseTableValidation implements IValidation {
  async validate(page: Page, validation: string, subHeaderName: string, data: validationRecord): Promise<void> {
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      const subheaderLocator = page.locator(`h2:has-text("${subHeaderName}")`);
      const subheaderCount = await subheaderLocator.count();

      if (subheaderCount === 0) {
        throw new Error(`Subheader "${subHeaderName}" not found on the page`);
      }
      if (subHeaderName === 'Statement of truth') {
        await page.locator('h2.govuk-heading-m', {
          hasText: 'Statement of truth',
        }).waitFor({
          state: 'visible',
          timeout: 30000,
        });
      }
      const keyLocator = page.locator(
        `xpath=//h2[normalize-space()="${subHeaderName}"]/following-sibling::dl[1]//dt[normalize-space()="${key}"]`
      );
      const keyCount = await keyLocator.count();

      if (keyCount === 0) {
        throw new Error(`Key "${key}" not found under subheader "${subHeaderName}"`);
      }

      const valueLocator = page.locator(
        `xpath=//h2[normalize-space()="${subHeaderName}"]/following-sibling::dl[1]//dt[normalize-space()="${key}"]/following-sibling::dd[1]`
      );

      const actualText = await valueLocator.first().textContent();

      expect(
        actualText?.trim().replace(/\s+/g, ' '),
        `"${key}" under "${subHeaderName}"\nExpected: "${value}"\nActual:   "${actualText?.trim().replace(/\s+/g, ' ')}"`
      ).toBe((value as string).trim().replace(/\s+/g, ' '));
    }
  }
}
