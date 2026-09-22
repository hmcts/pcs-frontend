import { counterClaimAgainstWhom } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function counterClaimAgainstWhomErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAgainstWhom.thereIsAProblemErrorMessageHeader,
    message: counterClaimAgainstWhom.selectWhoYouAreMakingErrorMessage,
  });
}
//Navigation tests will be enabled once all routing tickets is done
/*export async function counterClaimAgainstWhomNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimAgainstWhom.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimAgainstWhom.pageSlug,
  });

  if (process.env.USER_NEEDS_HELP === 'YES') {
    await performValidation('pageNavigation', counterClaimAgainstWhom.backLink, counterClaimHaveYouAppliedForHelp.mainHeader);
  } else {
    await performValidation('pageNavigation', counterClaimAgainstWhom.backLink, counterClaimFee.mainHeader);
  }
}*/
