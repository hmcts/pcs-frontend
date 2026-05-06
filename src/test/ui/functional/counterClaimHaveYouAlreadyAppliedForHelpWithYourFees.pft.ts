import { counterClaim, counterClaimHaveYouAlreadyAppliedForHelpWithYourFees } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function counterClaimHaveYouAlreadyAppliedForHelpWithYourFeesErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.thereIsAProblemErrorMessageHeader,
    message:
      counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.selectIfYouHaveAlreadyAppliedForHelpAdultsErrorMessage,
  });

  await performAction('clickRadioButton', counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.yesRadioOption);

  await performAction(
    'inputText',
    counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.enterHelpWithFeeReferenceHiddenTextLabel,
    counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.emojiTextInput
  );
  await performAction('clickButton', counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.thereIsAProblemErrorMessageHeader,
    message: counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.emojiErrorMessage,
  });
}

export async function counterClaimHaveYouAlreadyAppliedForHelpWithYourFeesNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.backLink,
    counterClaim.mainHeader
  );
}
