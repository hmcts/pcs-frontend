import { feedback } from '../../data/page-data';
import { counterClaimAgainstWhom, counterClaimFee } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimAgainstWhomErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAgainstWhom.thereIsAProblemErrorMessageHeader,
    message: counterClaimAgainstWhom.selectWhoYouAreMakingErrorMessage,
  });
}

export async function counterClaimAgainstWhomNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimAgainstWhom.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    feedbackPageUrl: `respond-to-claim/${counterClaimAgainstWhom.pageSlug}`,
  });
  await performValidation('pageNavigation', counterClaimAgainstWhom.backLink, counterClaimFee.mainHeader);
}
