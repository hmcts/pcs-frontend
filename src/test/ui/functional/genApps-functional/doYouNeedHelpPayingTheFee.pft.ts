import { doYouNeedHelpPayingTheFee } from '../../data/page-data/genApps-page-data';
import { performAction } from '../../utils/controller';

export async function doYouNeedHelpPayingTheFeeErrorValidation(): Promise<void> {
  const pageData = doYouNeedHelpPayingTheFee('');
  await performAction('inputErrorValidationGenApp', {
    validationType: pageData.errorValidationType.one,
    inputArray: pageData.errorValidationField.errorRadioOption,
    header: pageData.thereIsAProblemErrorMessageHeader,
    question: pageData.doYouNeedHelpPayingTheFeeQuestion,
    option: pageData.iNeedHelpPayingTheFeeRadioOption,
    button: pageData.continueButton,
  });
}
