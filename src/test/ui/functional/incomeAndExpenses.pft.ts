import { feedback, incomeAndExpenses, taskList } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function incomeAndExpensesErrorValidation(): Promise<void> {
  await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: incomeAndExpenses.errorValidationHeader,
    message: incomeAndExpenses.selectIfYouWantToProvideDetailsErrorMessage,
  });
}

export async function incomeAndExpensesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', incomeAndExpenses.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: incomeAndExpenses.pageSlug,
  });
  await performValidation('pageNavigation', incomeAndExpenses.backLink, taskList.mainHeader);
}
