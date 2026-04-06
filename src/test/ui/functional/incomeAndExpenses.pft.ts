import { dashboard, exceptionalHardship, feedback, incomeAndExpenses } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function incomeAndExpensesErrorValidation(): Promise<void> {
  await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: incomeAndExpenses.errorValidationHeader,
    message: incomeAndExpenses.selectIfYouWantToProvideDetailsErrorMessage,
  });
}

export async function tenancyDateDetailsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', incomeAndExpenses.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: incomeAndExpenses.pageSlug,
  });
  await performValidation('pageNavigation', incomeAndExpenses.backLink, exceptionalHardship.mainHeader);
  await performAction('clickRadioButton', incomeAndExpenses.yesRadioOption);
  await performValidation('pageNavigation', incomeAndExpenses.saveForLaterButton, dashboard.mainHeader);
}
