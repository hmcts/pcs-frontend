import { Locator, Page } from '@playwright/test';

import { QUESTION_LABEL_SELECTOR, anyOf, waitForInteractive } from '../../common/locator.utils';
import { IAction, actionRecord } from '../../interfaces';

function radioNames(name: string): string[] {
  const match = /^(?:Paid|Received) every (week|month)$/.exec(name);
  if (!match) {
    return [name];
  }
  return [name, match[1] === 'week' ? 'Week' : 'Month'];
}

export class ClickRadioButtonAction implements IAction {
  async execute(page: Page, action: string, params: string | actionRecord): Promise<void> {
    if (typeof params === 'string') {
      const radio = anyOf(...radioNames(params).map(name => page.getByRole('radio', { name, exact: true })));
      await waitForInteractive(radio);
      await radio.check();
      return;
    }

    const { question, option, index } = params as actionRecord;
    const idx = index !== undefined ? Number(index) : 0;
    const names = radioNames(String(option));

    const radioInFieldset = anyOf(...names.map(name => this.radioInFieldset(page, question as string, name, idx)));
    const radioNearQuestionLabel = anyOf(
      ...names.map(name => this.radioNearQuestionLabel(page, question as string, name, idx))
    );

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
