import { counterClaim, counterClaimWhatAreYouClaimingFor, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function counterClaimWhatAreYouClaimingForErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimWhatAreYouClaimingFor.saveAndContinueButton);
  console.log(`clicked save and continue without selecting any option`);

  await performValidation('errorMessage', {
    header: counterClaimWhatAreYouClaimingFor.thereIsAProblemErrorMessageHeader,
    message: counterClaimWhatAreYouClaimingFor.sumOfMoneyErrorMessage,
  });
}

export async function counterClaimWhatAreYouClaimingForNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimWhatAreYouClaimingFor.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimWhatAreYouClaimingFor.pageSlug,
  });
  await performValidation('pageNavigation', counterClaimWhatAreYouClaimingFor.backLink, counterClaim.mainHeader);
}
