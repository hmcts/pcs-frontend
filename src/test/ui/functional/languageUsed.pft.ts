import { equalityAndDiversityEnd, languageUsed } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function languageUsedErrorValidation(): Promise<void> {
  await performAction('clickButton', languageUsed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: languageUsed.thereIsAProblemErrorMessageHeader,
    message: languageUsed.errorHiddenMessage,
  });
}

export async function languageUsedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', languageUsed.backLink, equalityAndDiversityEnd.mainHeader);
}
