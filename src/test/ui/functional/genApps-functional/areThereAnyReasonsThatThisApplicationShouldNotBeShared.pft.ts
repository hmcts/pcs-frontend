import { areThereAnyReasonsThatThisApplicationShouldNotBeShared } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function areThereAnyReasonsThatThisApplicationShouldNotBeSharedErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: areThereAnyReasonsThatThisApplicationShouldNotBeShared.errorValidationType.one,
    inputArray: areThereAnyReasonsThatThisApplicationShouldNotBeShared.errorValidationField.errorRadioOption,
    header: areThereAnyReasonsThatThisApplicationShouldNotBeShared.thereIsAProblemErrorMessageHeader,
    question: areThereAnyReasonsThatThisApplicationShouldNotBeShared.areThereAnyReasonQuestion,
    option: areThereAnyReasonsThatThisApplicationShouldNotBeShared.yesRadioOption,
    button: areThereAnyReasonsThatThisApplicationShouldNotBeShared.continueButton,
  });

  await performAction('inputErrorValidationGenApp', {
    validationType: areThereAnyReasonsThatThisApplicationShouldNotBeShared.errorValidationType.two,
    inputArray: areThereAnyReasonsThatThisApplicationShouldNotBeShared.errorValidationField.errorTextField,
    header: areThereAnyReasonsThatThisApplicationShouldNotBeShared.thereIsAProblemErrorMessageHeader,
    label: areThereAnyReasonsThatThisApplicationShouldNotBeShared.provideReasonHiddenTextLabel,
    button: areThereAnyReasonsThatThisApplicationShouldNotBeShared.continueButton,
  });
}
