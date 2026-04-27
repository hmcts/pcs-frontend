import { checkYourAnswersGenApps } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function checkYourAnswersGenAppsErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: checkYourAnswersGenApps.errorValidationType.three,
    inputArray: checkYourAnswersGenApps.errorValidationField.errorCheckBoxOption,
    header: checkYourAnswersGenApps.thereIsAProblemErrorMessageHeader,
    question: checkYourAnswersGenApps.statementOfTruthQuestion,
    option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
    button: checkYourAnswersGenApps.continueToPaymentButton,
  });

  await performAction('inputErrorValidationGenApp', {
    validationType: checkYourAnswersGenApps.errorValidationType.two,
    inputArray: checkYourAnswersGenApps.errorValidationField.errorTextField,
    header: checkYourAnswersGenApps.thereIsAProblemErrorMessageHeader,
    label: checkYourAnswersGenApps.yourFullNameTextLabel,
    button: checkYourAnswersGenApps.continueToPaymentButton,
  });
}
