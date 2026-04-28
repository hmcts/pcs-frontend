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
      await this.checkByLabel(page, params);
      return;
    }

    if (Array.isArray(params)) {
      for (const option of params) {
        await this.checkByLabel(page, option);
      }
      return;
    }

    if (Array.isArray(params.option)) {
      for (const opt of params.option) {
        await this.checkByLabel(page, opt);
      }
    } else {
      await this.checkByLabel(page, params.option as string);
    }
  }

  // HANDLE UNCHECK
  private async handleUncheck(page: Page, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      await this.uncheckByLabel(page, params);
      return;
    }

    if (Array.isArray(params)) {
      for (const option of params) {
        await this.uncheckByLabel(page, option);
      }
      return;
    }

    if (Array.isArray(params.option)) {
      for (const opt of params.option) {
        await this.uncheckByLabel(page, opt);
      }
    } else {
      await this.uncheckByLabel(page, params.option as string);
    }
  }

  private async checkByLabel(page: Page, option: string) {
    const checkbox = page.getByRole('checkbox', { name: option, exact: true });

    await checkbox.waitFor({ state: 'visible' });

    await checkbox.check();
  }

  private async uncheckByLabel(page: Page, option: string) {
    const checkbox = page.getByRole('checkbox', { name: option, exact: true });

    await checkbox.waitFor({ state: 'visible' });

    await checkbox.uncheck();
  }

  private async unCheck(page: Page, label: string) {
    await page.getByLabel(label, { exact: true }).uncheck();
  }
}
