import { counterClaim, dashboard, feedback, nonRentArrearsDispute, rentArrears } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function counterClaimErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaim.thereIsAProblemErrorMessageHeader,
    message: counterClaim.selectIfYouArePlanningToMakeClaimErrorMessage,
  });
}

export async function counterClaimNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaim.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaim.pageSlug,
  });

  if (process.env.RENT_ARREARS === 'YES' && process.env.RENT_NON_RENT === 'NO') {
    await performValidation('pageNavigation', counterClaim.backLink, rentArrears.mainHeader);
  } else {
    await performValidation('pageNavigation', counterClaim.backLink, nonRentArrearsDispute.mainHeader);
  }
  await performAction('clickRadioButton', counterClaim.noRadioOption);
  await performValidation('pageNavigation', counterClaim.saveForLaterButton, dashboard.mainHeader);
}
