import {
  dashboard,
  installmentPayments,
  repaymentsAgreed,
  //feedback,
  yourHouseholdAndCircumstances,
} from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performValidation } from '../utils/controller';

export async function yourHouseholdAndCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.feedbackLink, {
    // element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: yourHouseholdAndCircumstances.pageSlug,
  });
  if (process.env.REPAYMENTS_AGREED === 'NO') {
    if (claimantsName) {
      await performValidation('pageNavigation', yourHouseholdAndCircumstances.backLink, installmentPayments.mainHeader);
    }
  } else {
    if (claimantsName) {
      await performValidation(
        'pageNavigation',
        yourHouseholdAndCircumstances.backLink,
        repaymentsAgreed.getMainHeader(claimantsName)
      );
    }
  }
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.cancelLink, dashboard.mainHeader);
}
