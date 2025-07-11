import { Page } from '@playwright/test';

import { IAction } from '../../interfaces/action.interface';

export class CheckAction implements IAction {
  async execute(page: Page, fieldName: string): Promise<void> {
    const locator = page.locator(`
      .govuk-checkboxes__item input[type="checkbox"] + .govuk-label govuk-checkboxes__label:has-text("${fieldName}"),
      .govuk-checkboxes__item input[type="checkbox"] ~ .govuk-label:has-text("${fieldName}")
    `);
    await locator.check();
  }
}
