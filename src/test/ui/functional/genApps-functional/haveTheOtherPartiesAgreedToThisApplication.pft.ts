import { haveTheOtherPartiesAgreedToThisApplication } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function haveTheOtherPartiesAgreedToThisApplicationErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: haveTheOtherPartiesAgreedToThisApplication.errorValidationType.one,
    inputArray: haveTheOtherPartiesAgreedToThisApplication.errorValidationField.errorRadioOption,
    header: haveTheOtherPartiesAgreedToThisApplication.thereIsAProblemErrorMessageHeader,
    question: haveTheOtherPartiesAgreedToThisApplication.haveTheOtherPartiesAgreedQuestion,
    option: haveTheOtherPartiesAgreedToThisApplication.yesRadioOption,
    button: haveTheOtherPartiesAgreedToThisApplication.continueButton,
  });
}
