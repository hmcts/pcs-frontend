import { Page, expect } from '@playwright/test';

import { serviceRequestPayment } from '../../../data/page-data';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class PaymentAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectPaymentOptions', () => this.selectPaymentOptions(fieldName as actionRecord, page)],
    ]);

    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectPaymentOptions(paymentOptions: actionRecord, page: Page): Promise<void> {
    const amountLabel = paymentOptions.amountLabel;
    if (typeof amountLabel === 'string' && amountLabel !== '') {
      await performValidation('elementToBeVisible', amountLabel);
    }

    const expectedAmount = paymentOptions.expectedAmount;
    if (typeof expectedAmount === 'string' && expectedAmount !== '') {
      await expect(page.getByText(expectedAmount, { exact: true })).toBeVisible();
    }

    await performAction('clickRadioButton', String(paymentOptions.payByOption));

    if (paymentOptions.payByOption === serviceRequestPayment.payByAccountRadioOption) {
      await performAction('select', paymentOptions.pbaLabel, paymentOptions.pbaValue);

      const buttonText = String(paymentOptions.button);
      const button = page.locator('button', { hasText: buttonText });

      if (paymentOptions.assertButtonDisabledBeforeReference === true) {
        await expect(button).toBeDisabled();
      }

      await performAction('inputText', paymentOptions.referenceLabel, paymentOptions.referenceText);
      await page.click('body');

      if (paymentOptions.assertButtonEnabledAfterReference !== false) {
        await expect(button).toBeEnabled();
      }
    }

    await performAction('clickButton', paymentOptions.button);
  }
}
