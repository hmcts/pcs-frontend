import { dashboard, feedback, haveYouAppliedForUniversalCredit, priorityDebts, regularIncome } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function priorityDebtsErrorValidation(): Promise<void> {
  await performAction('clickButton', priorityDebts.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebts.errorValidationHeader,
    message: priorityDebts.selectIfYouHaveErrorMessage,
  });
}

export async function priorityDebtsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', priorityDebts.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: priorityDebts.pageSlug,
  });
  if (process.env.REGULAR_INCOME === 'UNIVERSAL_CREDIT') {
    await performValidation('pageNavigation', priorityDebts.backLink, regularIncome.mainHeader);
  } else {
    await performValidation('pageNavigation', priorityDebts.backLink, haveYouAppliedForUniversalCredit.mainHeader);
  }
  await performAction('clickRadioButton', priorityDebts.noRadioOption);
  await performValidation('pageNavigation', priorityDebts.saveForLaterButton, dashboard.mainHeader);
}
