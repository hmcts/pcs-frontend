import { counterClaim, paymentInterstitial } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function paymentInterstitialNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', paymentInterstitial.backLink, counterClaim.mainHeader);
  await performValidation('pageNavigation', paymentInterstitial.cancelLink, 'Dashboard');
}
