import { counterClaim, counterClaimAbout, dashboard, feedback, paymentInterstitial } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function paymentInterstitialNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', paymentInterstitial.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: paymentInterstitial.pageSlug,
  });
  if (process.env.SELECT_COUNTER_CLAIM === 'YES') {
    await performValidation('pageNavigation', paymentInterstitial.backLink, counterClaimAbout.mainHeader);
  } else {
    await performValidation('pageNavigation', paymentInterstitial.backLink, counterClaim.mainHeader);
  }
  await performValidation('pageNavigation', paymentInterstitial.cancelLink, dashboard.mainHeader);
}
