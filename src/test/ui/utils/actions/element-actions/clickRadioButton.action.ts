import { Locator, Page } from '@playwright/test';

import { QUESTION_LABEL_SELECTOR, anyOf, waitForInteractive } from '../../common/locator.utils';
import { IAction, actionRecord } from '../../interfaces';

export class ClickRadioButtonAction implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      const radio = page.getByRole('radio', { name: params, exact: true }).first();
      await waitForInteractive(radio);
      await radio.check();
      return;
    }

    const { question, option, index } = params as actionRecord;
    const idx = index !== undefined ? Number(index) : 0;

    const radioInFieldset = this.radioInFieldset(page, question as string, option as string, idx);
    const radioNearQuestionLabel = this.radioNearQuestionLabel(page, question as string, option as string, idx);

    // Wait for whichever shape this page uses before the count() probe below.
    await waitForInteractive(anyOf(radioInFieldset, radioNearQuestionLabel));

    if ((await radioInFieldset.count()) > 0) {
      await radioInFieldset.first().check();
      return;
    }

    await radioNearQuestionLabel.first().check();
  }

  private radioInFieldset(page: Page, question: string, option: string, idx: number): Locator {
    return page
      .locator('fieldset')
      .filter({ hasText: question })
      .nth(idx)
      .getByRole('radio', { name: option, exact: true });
  }

  private radioNearQuestionLabel(page: Page, question: string, option: string, idx: number): Locator {
    return page
      .locator(QUESTION_LABEL_SELECTOR)
      .filter({ hasText: question })
      .nth(idx)
      .locator('..')
      .getByRole('radio', { name: option, exact: true });
  }
}
