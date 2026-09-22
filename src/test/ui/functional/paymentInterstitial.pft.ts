import { dashboard, feedback, paymentInterstitial, taskList } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function paymentInterstitialNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', paymentInterstitial.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: paymentInterstitial.pageSlug,
  });
  await performValidation('pageNavigation', paymentInterstitial.backLink, taskList.mainHeader);
  await performValidation('pageNavigation', paymentInterstitial.cancelLink, dashboard.mainHeader);
}
