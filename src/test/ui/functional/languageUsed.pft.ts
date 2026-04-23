import { equalityAndDiversityEnd, languageUsed as languageUsedPage } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function languageUsedErrorValidation(): Promise<void> {
  await performAction('clickButton', languageUsedPage.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: languageUsedPage.thereIsAProblemErrorMessageHeader,
    message: languageUsedPage.errorHiddenMessage,
  });
}

export async function languageUsedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', languageUsedPage.backLink, equalityAndDiversityEnd.mainHeader);
}
