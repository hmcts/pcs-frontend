import { Page } from '@playwright/test';

import { IAction } from '../../interfaces/action.interface';

export class clickRadioButton implements IAction {
  async execute(page: Page, fieldName: string): Promise<void> {
    const locator = page.locator(`
      .govuk-radios__item input[type="radio"] + .govuk-radios__label:has-text("${fieldName}"),
      .govuk-radios__item input[type="radio"] ~ .govuk-label:has-text("${fieldName}")`);
    await locator.click();
  }
}
