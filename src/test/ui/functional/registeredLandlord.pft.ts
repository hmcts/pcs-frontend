import { submitCaseApiData } from '../data/api-data';
import { disputeClaimInterstitial, registeredLandlord } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function registeredLandlordErrorValidation(): Promise<void> {
  await performAction('clickButton', registeredLandlord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: registeredLandlord.thereIsAProblemErrorMessageHeader,
    message: registeredLandlord.selectIfYouAgreeWithLandlordsClaimRegisteredErrorMessage,
  });
}

export async function registeredLandlordNavigationTests(): Promise<void> {
  const claimantsName = submitCaseApiData.submitCasePayload.claimantName;
  await performValidation(
    'pageNavigation',
    registeredLandlord.backLink,
    disputeClaimInterstitial.getMainHeader(claimantsName)
  );
  // --skipping this below line until pageNavigation validation supports to window handling-- story created HDPI-5329 in QA improvements board.
  //await performValidation('pageNavigation', registeredLandlord.publicRegisterLink,'Public Register');
  await performAction('clickRadioButton', registeredLandlord.yesRadioOption);
  await performValidation('pageNavigation', registeredLandlord.saveForLaterButton, 'Dashboard');
}
