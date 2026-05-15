import { counterClaim, counterClaimAbout, dashboard, feedback, paymentInterstitial } from '../data/page-data';
import { counterClaimHaveYouAppliedForHelp } from '../data/page-data/counterClaimHaveYouAppliedForHelp.page.data';
import { performValidation } from '../utils/controller';

export async function paymentInterstitialNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', paymentInterstitial.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: paymentInterstitial.pageSlug,
  });
  if (process.env.SELECT_COUNTER_CLAIM === 'YES') {
    if (process.env.I_NEED_HELP === 'YES') {
      await performValidation(
        'pageNavigation',
        paymentInterstitial.backLink,
        counterClaimHaveYouAppliedForHelp.mainHeader
      );
    } else {
      await performValidation('pageNavigation', paymentInterstitial.backLink, counterClaimAbout.mainHeader);
    }
  } else {
    await performValidation('pageNavigation', paymentInterstitial.backLink, counterClaim.mainHeader);
  }
  await performValidation('pageNavigation', paymentInterstitial.cancelLink, dashboard.mainHeader);
}
