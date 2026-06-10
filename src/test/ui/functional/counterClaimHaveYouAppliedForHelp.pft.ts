import { counterClaimFee, counterClaimHaveYouAppliedForHelp, feedback, taskList } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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

export async function counterClaimHaveYouAppliedForHelpNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimHaveYouAppliedForHelp.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimHaveYouAppliedForHelp.pageSlug,
  });
  await performValidation('pageNavigation', counterClaimHaveYouAppliedForHelp.backLink, counterClaimFee.mainHeader);
  await performAction('clickRadioButton', counterClaimHaveYouAppliedForHelp.yesRadioOption);
  await performAction(
    'inputText',
    counterClaimHaveYouAppliedForHelp.enterHelpWithFeeReferenceHiddenTextLabel,
    counterClaimHaveYouAppliedForHelp.helpWithFeeReferenceTextInput
  );
  await performValidation('pageNavigation', counterClaimHaveYouAppliedForHelp.saveForLaterButton, taskList.mainHeader);
}
