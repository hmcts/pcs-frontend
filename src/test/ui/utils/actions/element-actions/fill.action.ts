import { Page } from '@playwright/test';

import { IAction } from '../../interfaces/action.interface';

export class FillAction implements IAction {
  async execute(page: Page, fieldName: string, value?: string): Promise<void> {
    if (!value) {
      throw new Error('Fill action requires a value');
    }
    const locator = page.locator(`label:has-text("${fieldName}") + input,
           label:has-text("${fieldName}") ~ input,
           [aria-label="${fieldName}"],
           [placeholder="${fieldName}"]`);
    await locator.fill(value);
  }
}
