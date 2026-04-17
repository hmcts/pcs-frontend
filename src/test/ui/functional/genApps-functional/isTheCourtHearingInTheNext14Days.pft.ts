import { isTheCourtHearingInTheNext14Days } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function isTheCourtHearingInTheNext14DaysErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: isTheCourtHearingInTheNext14Days.errorValidationType.one,
    inputArray: isTheCourtHearingInTheNext14Days.errorValidationField.errorRadioOption,
    header: isTheCourtHearingInTheNext14Days.thereIsAProblemErrorMessageHeader,
    question: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
    option: isTheCourtHearingInTheNext14Days.yesRadioOption,
    button: isTheCourtHearingInTheNext14Days.continueButton,
  });
}
