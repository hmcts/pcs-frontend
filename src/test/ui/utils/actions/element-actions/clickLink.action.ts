import { Locator, Page } from '@playwright/test';

import { IAction } from '../../interfaces/action.interface';

export class ClickLinkAction implements IAction {
  async execute(page: Page, fieldName: string): Promise<void> {
    const locator: Locator = page.locator(`a:has-text("${fieldName}")`);
    await locator.first().waitFor({ state: 'visible' });
    await locator.first().click();
  }
}
