import { checkYourAnswersGenApps, isTheCourtHearingInTheNext14Days } from '../../data/page-data/genApps-page-data';
import { FieldsStore } from '../../utils/actions/custom-actions';
import { performAction } from '../../utils/controller';

export async function checkYourAnswersGenAppsErrorValidation(): Promise<void> {
  const dynamicButton =
    FieldsStore.get(isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion as string) === 'Yes'
      ? checkYourAnswersGenApps.continueToPaymentHiddenButton
      : checkYourAnswersGenApps.submitHiddenButton;
  await performAction('inputErrorValidationGenApp', {
    validationType: checkYourAnswersGenApps.errorValidationType.three,
    inputArray: checkYourAnswersGenApps.errorValidationField.errorCheckBoxOption,
    header: checkYourAnswersGenApps.thereIsAProblemErrorMessageHeader,
    question: checkYourAnswersGenApps.statementOfTruthQuestion,
    option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
    button: dynamicButton,
  });

  await performAction('inputErrorValidationGenApp', {
    validationType: checkYourAnswersGenApps.errorValidationType.two,
    inputArray: checkYourAnswersGenApps.errorValidationField.errorTextField,
    header: checkYourAnswersGenApps.thereIsAProblemErrorMessageHeader,
    label: checkYourAnswersGenApps.yourFullNameTextLabel,
    button: dynamicButton,
  });
}
