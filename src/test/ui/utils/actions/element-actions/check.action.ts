import { Page } from '@playwright/test';

import { IAction, actionData } from '../../interfaces/action.interface';

export class CheckAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData): Promise<void> {
    if (fieldName === 'string') {
      await this.clickCheckBox(page, fieldName);
    } else {
      for (const option of fieldName as string[]) {
        await this.clickCheckBox(page, option);
      }
    }
  }
  private async clickCheckBox(page: Page, checkbox: string) {
    await page.getByRole('checkbox', { name: checkbox as string }).check();
  }
}
