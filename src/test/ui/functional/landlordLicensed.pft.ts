import { dashboard, landlordLicensed, landlordRegistered, writtenTerms } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

import { setTenancyTypeDetailsBackNavigation } from './tenancyTypeDetails.pft';

export async function landlordLicensedErrorValidation(): Promise<void> {
  await performAction('clickButton', landlordLicensed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: landlordLicensed.thereIsAProblemErrorMessageHeader,
    message: landlordLicensed.selectIfYouAgreeWithLandlordsClaimLicensedErrorMessage,
  });
}

export async function landlordLicensedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', landlordLicensed.backLink, landlordRegistered.mainHeader);
  await performAction('clickRadioButton', landlordLicensed.yesRadioOption);
  await performValidation('pageNavigation', landlordLicensed.saveForLaterButton, dashboard.mainHeader);
  // In Wales, tenancy-type-details back link goes to written-terms (not dispute-claim-interstitial)
  setTenancyTypeDetailsBackNavigation(writtenTerms.mainHeader);
}
