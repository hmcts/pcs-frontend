import { doYouNeedHelpPayingTheFee } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function doYouNeedHelpPayingTheFeeErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: doYouNeedHelpPayingTheFee.errorValidationType.one,
    inputArray: doYouNeedHelpPayingTheFee.errorValidationField.errorRadioOption,
    header: doYouNeedHelpPayingTheFee.thereIsAProblemErrorMessageHeader,
    question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
    option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    button: doYouNeedHelpPayingTheFee.continueButton,
  });
}
