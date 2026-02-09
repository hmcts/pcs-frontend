import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class ClickLinkAction implements IAction {
  async execute(page: Page, action: string, fieldName: string): Promise<void> {
    const locator = page.getByRole('link', { name: fieldName, exact: true });
    await locator.click();
  }
}
