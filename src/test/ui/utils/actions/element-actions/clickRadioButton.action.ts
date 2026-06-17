import { Page } from '@playwright/test';

import { IAction, actionRecord } from '../../interfaces';

export class ClickRadioButtonAction implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      await page.getByRole('radio', { name: params, exact: true }).first().check();
      return;
    }

    const { question, option, index } = params as actionRecord;
    const idx = index !== undefined ? Number(index) : 0;

    const fieldset = page
      .locator('fieldset')
      .filter({ hasText: question as string })
      .nth(idx);

    if ((await fieldset.count()) > 0) {
      await fieldset
        .getByRole('radio', {
          name: option as string,
          exact: true,
        })
        .check();
      return;
    }

    const questionLocator = page
      .locator(
        'p.govuk-heading-m, h2.govuk-heading-m, h1.govuk-fieldset__heading, p.govuk-fieldset__legend, h1.govuk-heading-l'
      )
      .filter({ hasText: question as string })
      .nth(idx);

    await questionLocator
      .locator('..')
      .getByRole('radio', {
        name: option as string,
        exact: true,
      })
      .check();
  }
}
