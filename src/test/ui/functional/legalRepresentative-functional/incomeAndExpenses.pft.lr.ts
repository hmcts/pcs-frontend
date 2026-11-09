import { incomeAndExpenses } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function incomeAndExpensesErrorValidation(): Promise<void> {
  await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: incomeAndExpenses.errorValidationHeader,
    message: incomeAndExpenses.selectIfDefendantWantToProvideDetailsErrorMessage,
  });
}
