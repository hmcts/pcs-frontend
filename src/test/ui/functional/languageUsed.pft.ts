import { equalityAndDiversityEnd, feedback, languageUsed } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function languageUsedErrorValidation(): Promise<void> {
  await performAction('clickButton', languageUsed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: languageUsed.thereIsAProblemErrorMessageHeader,
    message: languageUsed.errorMessage,
  });
}

export async function languageUsedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', languageUsed.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: languageUsed.pageSlug,
  });
  await performValidation('pageNavigation', languageUsed.backLink, equalityAndDiversityEnd.mainHeader);
}
