import { Page } from '@playwright/test';

import { IAction, actionRecord } from '../../interfaces';

export class CheckAction implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['check', () => this.handleCheck(page, params)],
      ['uncheck', () => this.handleUncheck(page, params)],
    ]);

    const actionToPerform = actionsMap.get(action);

    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }

    await actionToPerform();
  }

  //HANDLE CHECK
  private async handleCheck(page: Page, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      await this.clickCheckBox(page, params);
    } else if (Array.isArray(params)) {
      for (const option of params) {
        await this.clickCheckBox(page, option);
      }
    } else {
      const fieldset = page.locator('fieldset', {
        has: page.getByText(params.question as string, { exact: true }),
      });

      if (Array.isArray(params.option)) {
        for (const opt of params.option) {
          await fieldset.getByRole('checkbox', { name: opt, exact: true }).check();
        }
      } else {
        await fieldset.getByRole('checkbox', { name: params.option as string, exact: true }).check();
      }
    }
  }

  // HANDLE UNCHECK (NEW)
  private async handleUncheck(page: Page, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      await this.unCheck(page, params);
    } else if (Array.isArray(params)) {
      for (const option of params) {
        await this.unCheck(page, option);
      }
    } else {
      const fieldset = page.locator('fieldset', {
        has: page.getByText(params.question as string, { exact: true }),
      });

      if (Array.isArray(params.option)) {
        for (const opt of params.option) {
          await fieldset.getByRole('checkbox', { name: opt, exact: true }).uncheck();
        }
      } else {
        await fieldset.getByRole('checkbox', { name: params.option as string, exact: true }).uncheck();
      }
    }
  }

  private async clickCheckBox(page: Page, label: string) {
    await page.getByLabel(label, { exact: true }).check();
  }

  private async unCheck(page: Page, label: string) {
    await page.getByLabel(label, { exact: true }).uncheck();
  }
}
