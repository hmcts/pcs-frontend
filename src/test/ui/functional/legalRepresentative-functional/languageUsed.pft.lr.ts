import { languageUsed } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function languageUsedErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', languageUsed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: languageUsed.thereIsAProblemErrorMessageHeader,
    message: languageUsed.errorHiddenMessage,
  });
}
