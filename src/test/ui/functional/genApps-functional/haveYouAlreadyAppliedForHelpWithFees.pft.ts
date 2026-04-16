import { haveYouAlreadyAppliedForHelpWithFees } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function haveYouAlreadyAppliedForHelpWithFeesErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: haveYouAlreadyAppliedForHelpWithFees.errorValidationType.one,
    inputArray: haveYouAlreadyAppliedForHelpWithFees.errorValidationField.errorRadioOption,
    header: haveYouAlreadyAppliedForHelpWithFees.thereIsAProblemErrorMessageHeader,
    question: haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion,
    option: haveYouAlreadyAppliedForHelpWithFees.yesRadioOption,
    button: haveYouAlreadyAppliedForHelpWithFees.continueButton,
  });

  await performAction('inputErrorValidationGenApp', {
    validationType: haveYouAlreadyAppliedForHelpWithFees.errorValidationType.two,
    inputArray: haveYouAlreadyAppliedForHelpWithFees.errorValidationField.errorTextField,
    header: haveYouAlreadyAppliedForHelpWithFees.thereIsAProblemErrorMessageHeader,
    label: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceHiddenTextLabel,
    button: haveYouAlreadyAppliedForHelpWithFees.continueButton
  });
}
