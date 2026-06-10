import { counterClaimAbout } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
//Navigation tests will be enabled once all routing tickets is done
/*
export async function counterClaimAboutNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimAbout.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimAbout.pageSlug,
  });

  if (process.env.COUNTER_CLAIM_AGAINST_WHOM_PRESENT === 'YES') {
    await performValidation('pageNavigation', counterClaimAbout.backLink, counterClaimAgainstWhom.mainHeader);
  } else if (process.env.USER_NEEDS_HELP === 'YES') {
    await performValidation('pageNavigation', counterClaimAbout.backLink, counterClaimHaveYouAppliedForHelp.mainHeader);
  } else {
    await performValidation('pageNavigation', counterClaimAbout.backLink, counterClaimFee.mainHeader);
  }
}*/
