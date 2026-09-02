import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class ClickSummaryAction implements IAction {
  async execute(page: Page, action: string, summaryText: string): Promise<void> {
    // `.first()` keeps this strict-mode safe when a page repeats the same summary text.
    const summary = page.locator(`summary:has-text("${summaryText}")`).first();
    await summary.click();
  }
}
