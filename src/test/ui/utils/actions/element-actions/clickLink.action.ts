import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class ClickLinkAction implements IAction {
  async execute(page: Page, action: string, fieldName: string): Promise<void> {
    const locator = page.locator(
      `a:text-is("${fieldName}"), .govuk-details__summary-text:text-is("${fieldName}")`
    );
    await locator.click();
  }
}
