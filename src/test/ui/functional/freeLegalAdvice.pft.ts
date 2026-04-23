import { dashboard, feedback, freeLegalAdvice, startNow } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function freeLegalAdviceErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent: 'User must answer the free legal advice question before continuing.',
    screenTitle: freeLegalAdvice.mainHeader,
    actionsOrInputs: ['Click “Save and continue” without choosing Yes, No, or Prefer not to say.'],
    expectedAssertions: [
      {
        label: 'Mandatory radio',
        summaryTitle: freeLegalAdvice.thereIsAProblemErrorMessageHeader,
        messageContains: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
      },
    ],
  };
}

export async function freeLegalAdviceErrorValidation(): Promise<void> {
  await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProblemErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}

export async function freeLegalAdviceNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', freeLegalAdvice.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: freeLegalAdvice.pageSlug,
  });
  await performValidation('pageNavigation', freeLegalAdvice.backLink, startNow.mainHeader);
  await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, dashboard.mainHeader);
}
