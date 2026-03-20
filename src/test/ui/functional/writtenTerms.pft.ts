import { landlordRegistered } from '../data/page-data';
import { writtenTerms } from '../data/page-data/writtenTerms.page.data';
import { performAction, performValidation } from '../utils/controller';

export async function landlordRegisteredErrorValidation(): Promise<void> {
  await performAction('clickButton', landlordRegistered.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: landlordRegistered.thereIsAProblemErrorMessageHeader,
    message: landlordRegistered.selectIfYouAgreeWithLandlordsClaimRegisteredErrorMessage,
  });
}
export async function landlordRegisteredNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', writtenTerms.backLink, writtenTerms.mainHeader);
  await performAction('clickRadioButton', writtenTerms.yesRadioOption);
  await performValidation('pageNavigation', writtenTerms.saveForLaterButton, 'Dashboard');
}
