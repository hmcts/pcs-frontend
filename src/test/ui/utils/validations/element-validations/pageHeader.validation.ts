import { Page, expect } from '@playwright/test';

import { IValidation } from '../../interfaces';

export class MainHeaderValidation implements IValidation {
  async validate(page: Page, validation: string, fieldName: string): Promise<void> {
    const locator = page
      .locator(
        'legend h1.govuk-fieldset__heading, h1.govuk-heading-xl, h1.govuk-heading-l, legend.govuk-fieldset__legend--l'
      )
      .first();
    await expect(locator).toHaveText(fieldName);
  }
}
