import { counterClaimHaveYouAppliedForHelp } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimHaveYouAppliedForHelpErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimHaveYouAppliedForHelp.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimHaveYouAppliedForHelp.thereIsAProblemErrorMessageHeader,
    message: counterClaimHaveYouAppliedForHelp.selectIfYouHaveAlreadyAppliedForHelpAdultsErrorMessage,
  });

  await performAction('clickRadioButton', counterClaimHaveYouAppliedForHelp.yesRadioOption);

  await performAction(
    'inputText',
    counterClaimHaveYouAppliedForHelp.enterHelpWithFeeReferenceHiddenTextLabel,
    counterClaimHaveYouAppliedForHelp.emojiTextInput
  );
  await performAction('clickButton', counterClaimHaveYouAppliedForHelp.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimHaveYouAppliedForHelp.thereIsAProblemErrorMessageHeader,
    message: counterClaimHaveYouAppliedForHelp.emojiErrorMessage,
  });
}
