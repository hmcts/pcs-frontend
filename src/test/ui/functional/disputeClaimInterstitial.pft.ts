import {
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  dashboard,
  disputeClaimInterstitial,
  feedback,
} from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function disputeClaimInterstitialNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', disputeClaimInterstitial.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: disputeClaimInterstitial.pageSlug,
  });
  if (process.env.CONTACT_PREFERENCES_TELEPHONE === 'YES') {
    await performValidation(
      'pageNavigation',
      disputeClaimInterstitial.backLink,
      contactPreferencesTextMessage.mainHeader
    );
  } else {
    await performValidation(
      'pageNavigation',
      disputeClaimInterstitial.backLink,
      contactPreferencesTelephone.mainHeader
    );
  }
  await performValidation('pageNavigation', disputeClaimInterstitial.cancelLink, dashboard.mainHeader);
}
