import { chooseAnApplication } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function chooseAnApplicationErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: chooseAnApplication.errorValidationType.one,
    inputArray: chooseAnApplication.errorValidationField.errorRadioOption,
    header: chooseAnApplication.thereIsAProblemErrorMessageHeader,
    question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
    option: chooseAnApplication.adjournTheHearingRadioOption,
    button: chooseAnApplication.continueButton,
  });
}
