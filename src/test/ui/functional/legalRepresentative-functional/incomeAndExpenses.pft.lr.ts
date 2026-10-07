import { incomeAndExpenses } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function incomeAndExpensesErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', incomeAndExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: incomeAndExpenses.errorValidationHeader,
    message: incomeAndExpenses.selectIfDefendantWantToProvideDetailsErrorMessage,
  });
}
