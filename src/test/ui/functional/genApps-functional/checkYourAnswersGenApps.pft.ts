import {
  checkYourAnswersGenApps,
  haveYouAlreadyAppliedForHelpWithFees,
  isTheCourtHearingInTheNext14Days,
} from '../../data/page-data/genApps-page-data';
import { FieldsStore } from '../../utils/actions/custom-actions';
import { performAction } from '../../utils/controller';

export async function checkYourAnswersGenAppsErrorValidation(): Promise<void> {
  const key = haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion as string;
  const key1 = isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion as string;

  const value = FieldsStore.has(key) ? FieldsStore.get(key) : undefined;
  const value1 = FieldsStore.has(key1) ? FieldsStore.get(key1) : undefined;

  const payOrSubmit = value === 'Yes' || value1 === 'No';

  const dynamicButton = payOrSubmit
    ? checkYourAnswersGenApps.submitHiddenButton
    : checkYourAnswersGenApps.continueToPaymentHiddenButton;

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
