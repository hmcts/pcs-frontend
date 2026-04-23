import { equalityAndDiversityEnd, languageUsed } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function languageUsedErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent: 'Language used: must select how form was completed before continue.',
    screenTitle: languageUsed.mainHeader,
    actionsOrInputs: ['Click “Save and continue” without choosing a language option.'],
    expectedAssertions: [
      {
        label: 'Language choice required',
        summaryTitle: languageUsed.thereIsAProblemErrorMessageHeader,
        messageContains: languageUsed.errorHiddenMessage,
      },
    ],
  };
}

export async function languageUsedErrorValidation(): Promise<void> {
  await performAction('clickButton', languageUsed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: languageUsed.thereIsAProblemErrorMessageHeader,
    message: languageUsed.errorHiddenMessage,
  });
}

export async function languageUsedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', languageUsed.backLink, equalityAndDiversityEnd.mainHeader);
}
