import {
  counterClaimFee,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  dashboard,
  feedback,
} from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
export async function counterClaimFeeErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimFee.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimFee.thereIsAProblemErrorMessageHeader,
    message: counterClaimFee.selectIfYouNeedHelpErrorMessage,
  });
}

export async function counterClaimFeeNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimFee.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimFee.pageSlug,
  });

  if (process.env.SOMETHING_ELSE === 'YES') {
    await performValidation('pageNavigation', counterClaimFee.backLink, counterClaimWhatAreYouClaimingFor.mainHeader);
  } else {
    await performValidation('pageNavigation', counterClaimFee.backLink, counterClaimSpecificSumOfMoney.mainHeader);
  }
  await performAction('clickRadioButton', counterClaimFee.iNeedHelpRadioOption);
  await performValidation('pageNavigation', counterClaimFee.saveForLaterButton, dashboard.mainHeader);
}
