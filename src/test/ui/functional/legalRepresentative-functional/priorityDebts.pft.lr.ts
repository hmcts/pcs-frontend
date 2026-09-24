import { priorityDebts } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function priorityDebtsErrorValidation(): Promise<void> {
  await performAction('clickButton', priorityDebts.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebts.errorValidationHeader,
    message: priorityDebts.selectIfDefendantHasErrorMessage,
  });
}
