import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class clickLinkAndVerifySameTabTitleAction implements IAction {
  async execute(page: Page, action: string, fieldName: string, expectedHeader: string): Promise<void> {
    const link = page.locator(`a:text-is("${fieldName}")`);
    await link.waitFor({ state: 'visible' });
    await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
    const pageTitle = await page.title();
    if (!pageTitle.includes(expectedHeader)) {
      throw new Error(
        `Navigation failed. Expected title to contain: "${expectedHeader}", Actual title: "${pageTitle}"`
      );
    }
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
  }
}
