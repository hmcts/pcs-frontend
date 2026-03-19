
import { landlordRegistered, licensedLandlord } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function licensedLandlordErrorValidation(): Promise<void> {
  await performAction('clickButton', licensedLandlord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: licensedLandlord.thereIsAProblemErrorMessageHeader,
    message: licensedLandlord.selectIfYouAgreeWithLandlordsClaimLicensedErrorMessage,
  });
}

export async function licensedLandlordNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    licensedLandlord.backLink,landlordRegistered.mainHeader
  );
  // --skipping this below line until pageNavigation validation supports to window handling-- story created HDPI-5329 in QA improvements board.
  //await performValidation('pageNavigation', licensedLandlord.publicRegisterLink,'Public Register');
  await performAction('clickRadioButton', licensedLandlord.yesRadioOption);
  await performValidation('pageNavigation', licensedLandlord.saveForLaterButton, 'Dashboard');
}
