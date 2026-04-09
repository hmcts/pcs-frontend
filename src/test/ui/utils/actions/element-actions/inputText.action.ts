import { Page } from '@playwright/test';

import { IAction, actionRecord } from '../../interfaces';

export class InputTextAction implements IAction {
  async execute(page: Page, action: string, fieldParams: string | actionRecord, value: string): Promise<void> {
    let locator;

    if (typeof fieldParams === 'string') {
      locator = await this.getStringFieldLocator(page, fieldParams);
    } else {
      //STRICT checkbox container
      const container = page.locator(`.govuk-checkboxes__item:has(label:has-text("${fieldParams.text}"))`);

      //ONLY search INSIDE this container (no page-wide scan)
      locator = container.locator('input[type="text"]:not([disabled]), textarea:not([disabled])').first();
    }

    await locator.fill(value);
  }

  private async getStringFieldLocator(page: Page, fieldParams: string) {
    const roleLocator = page.getByRole('textbox', { name: fieldParams, exact: true });

    if ((await roleLocator.count()) > 0) {
      return roleLocator.first();
    }

    return page
      .locator(
        `
      :has-text("${fieldParams}") ~ input:visible:enabled,
      label:has-text("${fieldParams}") ~ textarea,
      label:has-text("${fieldParams}") + div input,
      :has-text("${fieldParams}") + textarea
    `
      )
      .first();
  }
}
