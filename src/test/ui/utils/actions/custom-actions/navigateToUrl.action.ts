import { Page } from '@playwright/test';

import { IAction } from '../../interfaces/action.interface';

export class NavigateToUrlAction implements IAction {
  async execute(page: Page, url: string): Promise<void> {
    if (!url) {
      throw new Error('URL is required for navigation');
    }
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    await page.goto(formattedUrl);

    await page.waitForLoadState('networkidle');
  }
}
