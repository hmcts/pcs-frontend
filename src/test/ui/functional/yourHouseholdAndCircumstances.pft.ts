import {
  dashboard,
  feedback,
  howMuchAffordToPay,
  installmentPayments,
  repaymentsAgreed,
  yourHouseholdAndCircumstances,
} from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performValidation } from '../utils/controller';

export async function yourHouseholdAndCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: yourHouseholdAndCircumstances.pageSlug,
  });
  if (process.env.REPAYMENT_AGREED === 'NO') {
    await performValidation('pageNavigation', yourHouseholdAndCircumstances.backLink, howMuchAffordToPay.mainHeader);
  } else if (process.env.REPAYMENT_AGREED !== 'NO') {
    await performValidation(
      'pageNavigation',
      yourHouseholdAndCircumstances.backLink,
      repaymentsAgreed.getMainHeader(claimantsName)
    );
  }
  if (process.env.INSTALLMENT_PAYMENT === 'NO') {
    await performValidation('pageNavigation', yourHouseholdAndCircumstances.backLink, installmentPayments.mainHeader);
  }
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.cancelLink, dashboard.mainHeader);
}
