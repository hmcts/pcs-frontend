import { feedback } from '../../data/page-data';
import {
  counterClaimFee,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
} from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

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
    feedbackPageUrl: `respond-to-claim/${counterClaimFee.pageSlug}`,
  });

  if (process.env.SOMETHING_ELSE === 'YES') {
    await performValidation('pageNavigation', counterClaimFee.backLink, counterClaimWhatAreYouClaimingFor.mainHeader);
  } else {
    await performValidation('pageNavigation', counterClaimFee.backLink, counterClaimSpecificSumOfMoney.mainHeader);
  }
}
