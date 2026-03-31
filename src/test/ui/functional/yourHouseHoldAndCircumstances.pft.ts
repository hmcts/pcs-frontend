import {
  dashboard,
  feedback,
  howMuchAffordToPay,
  installmentPayments,
  repaymentsAgreed,
  yourHouseHoldAndCircumstances,
} from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performValidation } from '../utils/controller';

export async function yourHouseholdAndCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourHouseHoldAndCircumstances.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: yourHouseHoldAndCircumstances.pageSlug,
  });
  if (process.env.REPAYMENT_AGREED === 'YES' || process.env.REPAYMENT_AGREED === 'I’M NOT SURE') {
    await performValidation(
      'pageNavigation',
      yourHouseHoldAndCircumstances.backLink,
      repaymentsAgreed.getMainHeader(claimantsName)
    );
  } else if (process.env.REPAYMENT_AGREED === 'NO') {
    await performValidation('pageNavigation', yourHouseHoldAndCircumstances.backLink, howMuchAffordToPay.mainHeader);
  } else if (process.env.INSTALLMENT_PAYMENT === 'NO') {
    await performValidation('pageNavigation', yourHouseHoldAndCircumstances.backLink, installmentPayments.mainHeader);
  }
  await performValidation('pageNavigation', yourHouseHoldAndCircumstances.saveForLaterButton, dashboard.mainHeader);
}
