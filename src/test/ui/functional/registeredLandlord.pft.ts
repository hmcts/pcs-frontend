import { registeredLandlord, startNow } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function registerLandlordErrorValidation(): Promise<void> {
  await performAction('clickButton', registeredLandlord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: registeredLandlord.thereIsAProblemErrorMessageHeader,
    message: registeredLandlord.selectIfYouAgreeWithLandlordsClaimRegisteredErrorMessage,
  });
}

export async function registerLandlordNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', registeredLandlord.backLink, startNow.mainHeader);
  await performAction('clickRadioButton', registeredLandlord.yesRadioOption);
  await performValidation('pageNavigation', registeredLandlord.saveForLaterButton, 'Dashboard');
}
