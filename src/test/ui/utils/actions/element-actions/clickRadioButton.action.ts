import { Page } from '@playwright/test';

import { IAction, actionRecord } from '../../interfaces/action.interface';

export class ClickRadioButton implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    const radioButton = typeof params === 'string'
      ? page.locator(`input[type="radio"] + label:has-text("${params}")`)
      : page.locator(`legend:has-text("${params.question}")`)
        .locator('..')
        .getByRole('radio', { name: params.option as string });
    await radioButton.click();
  }
}
