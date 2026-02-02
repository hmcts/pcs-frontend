import { Page } from '@playwright/test';

import { IAction, actionRecord } from '../../interfaces';

export class ClickRadioButtonAction implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      const radioButton = page.locator(`input[type="radio"] + label:has-text("${params}")`);
      await radioButton.click();
      return;
    }
    const { question, option, index } = params as actionRecord;
    const idx = index !== undefined ? Number(index) : 0;
    const targetQuestion = page
      .locator('fieldset')
      .filter({ hasText: question as string })
      .nth(idx);
    const radioButton = targetQuestion.getByRole('radio', { name: option as string });
    await radioButton.click();
  }
}
