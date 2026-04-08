import { dashboard, feedback, yourHouseholdAndCircumstances } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function yourHouseholdAndCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: yourHouseholdAndCircumstances.pageSlug,
  });
  // Commented out the 'Back' link navigation code as it covers 'No' condition as part of HDPI-4195 user story.
  /*
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
  */
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.cancelLink, dashboard.mainHeader);
}
