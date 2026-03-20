import { landlordLicensed } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function landlordLicensedErrorValidation(): Promise<void> {
  await performAction('clickButton', landlordLicensed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: landlordLicensed.thereIsAProblemErrorMessageHeader,
    message: landlordLicensed.selectIfYouAgreeWithLandlordsClaimLicensedErrorMessage,
  });
}

export async function landlordLicensedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', landlordLicensed.backLink, landlordLicensed.mainHeader);
  // --skipping this below line until pageNavigation validation supports to window handling-- story created HDPI-5329 in QA improvements board.
  //await performValidation('pageNavigation', licensedLandlord.publicRegisterLink,'Public Register');
  await performAction('clickRadioButton', landlordLicensed.yesRadioOption);
  await performValidation('pageNavigation', landlordLicensed.saveForLaterButton, 'Dashboard');
}
