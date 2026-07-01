import { Page, expect } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

export class viewClaimOrResponseTableValidation implements IValidation {
  async validate(page: Page, validation: string, subHeaderName: string, data: validationRecord): Promise<void> {
    const sectionHeader = page
      .locator('h2.govuk-heading-m, h2.govuk-heading-l')
      .filter({ hasText: subHeaderName })
      .first();
    await expect(sectionHeader).toBeVisible();
    const dl = sectionHeader.locator('xpath=following-sibling::dl[1]');
    for (const [key, value] of Object.entries(data)) {
      const dt = dl.locator(`dt:text-is("${key}")`).first();
      await expect(dt).toBeVisible();
      const dd = dt.locator('xpath=following-sibling::dd[1]');
      await expect(dd).toBeVisible();
      const actualText = (await dd.textContent())?.trim().replace(/\s+/g, ' ');
      expect(actualText, `"${key}" under "${subHeaderName}"`).toBe(String(value).trim().replace(/\s+/g, ' '));
    }
  }
}
