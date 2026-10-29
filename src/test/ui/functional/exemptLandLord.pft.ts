import { exemptLandLord, feedback, landlordRegistered } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function exemptLandLordErrorValidation(): Promise<void> {
  await performAction('clickButton', exemptLandLord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exemptLandLord.thereIsAProblemErrorMessageHeader,
    message: exemptLandLord.selectIfYouAgreeWithExemptLandLordErrorMessage,
  });
}

export async function exemptLandLordNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', exemptLandLord.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: exemptLandLord.pageSlug,
  });
  await performValidation('pageNavigation', exemptLandLord.backLink, landlordRegistered.mainHeader);
  await performAction('clickRadioButton', exemptLandLord.yesRadioOption);
}
