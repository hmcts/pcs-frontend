import { dashboard, feedback, installmentPayments, repaymentsAgreed } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';

export async function installmentPaymentsErrorValidation(): Promise<void> {
  await performAction('clickButton', installmentPayments.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: installmentPayments.thereIsAProblemErrorMessageHeader,
    message: installmentPayments.selectWhetherYouWouldLikeToOfferErrorMessage,
  });
}

export async function installmentPaymentsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', installmentPayments.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: installmentPayments.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    installmentPayments.backLink,
    repaymentsAgreed.getMainHeader(claimantsName)
  );
  await performAction('clickRadioButton', installmentPayments.yesRadioOption);
  await performValidation('pageNavigation', installmentPayments.saveForLaterButton, dashboard.mainHeader);
}
