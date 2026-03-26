import { landlordLicensed , writtenTerms } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function writtenTermsErrorValidation(): Promise<void> {
  await performAction('clickButton', writtenTerms.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: writtenTerms.thereIsAProblemErrorMessageHeader,
    message: writtenTerms.selectIfTheLandlordHasSentYouWrittenTermsOfTheOccupationContractErrorMessage,
  });
}
export async function writtenTermsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', writtenTerms.backLink, landlordLicensed.mainHeader);
  await performAction('clickRadioButton', writtenTerms.yesRadioOption);
  await performValidation('pageNavigation', writtenTerms.saveForLaterButton, 'Dashboard');
}
