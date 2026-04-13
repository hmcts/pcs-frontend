import { isTheCourtHearingInNext14Days } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function isTheCourtHearingInNext14DaysErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: isTheCourtHearingInNext14Days.errorValidationType.one,
    inputArray: isTheCourtHearingInNext14Days.errorValidationField.errorRadioOption,
    header: isTheCourtHearingInNext14Days.thereIsAProblemErrorMessageHeader,
    question: isTheCourtHearingInNext14Days.isTheCourtHearingInNext14DaysQuestion,
    option: isTheCourtHearingInNext14Days.yesRadioOption,
    button: isTheCourtHearingInNext14Days.continueButton,
  });
}
