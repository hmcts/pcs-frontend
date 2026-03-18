import { contactPreferencesTextMessage, disputeClaimInterstitial } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function disputeClaimInterstitialNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    disputeClaimInterstitial.backLink,
    contactPreferencesTextMessage.mainHeader
  );
  await performValidation('pageNavigation', disputeClaimInterstitial.cancelLink, 'Dashboard');
}
