import { dashboard, landlordLicensed, landlordRegistered } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
}
