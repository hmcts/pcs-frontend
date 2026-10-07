import { feedback } from '../../data/page-data';
import { counterClaimAbout, counterClaimFee } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimAboutErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimAbout.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAbout.thereIsAProblemErrorMessageHeader,
    message: counterClaimAbout.enterWhatYourCounterClaimErrorMessage,
  });
  await performValidation('errorMessage', {
    header: counterClaimAbout.thereIsAProblemErrorMessageHeader,
    message: counterClaimAbout.enterWhatYourReasonsAreForErrorMessage,
  });
}

export async function counterClaimAboutNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimAbout.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    feedbackPageUrl: `respond-to-claim/${counterClaimAbout.pageSlug}`,
  });
  await performValidation('pageNavigation', counterClaimAbout.backLink, counterClaimFee.mainHeader);
}
