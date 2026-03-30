import { dashboard, instalmentPayments, repaymentsAgreed } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function instalmentPaymentsErrorValidation(): Promise<void> {
  await performAction('clickButton', instalmentPayments.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: instalmentPayments.thereIsAProblemErrorMessageHeader,
    message: instalmentPayments.selectWhetherYouWouldLikeToOfferErrorMessage,
  });
}

export async function instalmentPaymentsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', instalmentPayments.backLink, repaymentsAgreed.mainHeader);
  await performAction('clickRadioButton', instalmentPayments.yesRadioOption);
  await performValidation('pageNavigation', instalmentPayments.saveForLaterButton, dashboard.mainHeader);
}
