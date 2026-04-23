import { dashboard, exceptionalHardship, feedback, yourCircumstances } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function yourExceptionalHardShipErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent:
      'Exceptional hardship: mandatory Yes/No; if Yes, details max 500 chars and counter visible (see nested steps).',
    screenTitle: exceptionalHardship.mainHeader,
    actionsOrInputs: [
      'Save without selecting whether exceptional hardship would apply.',
      'If Yes path: `generateRandomString(501)` into details, assert hint/counter, save (radio: `yourCircumstances.yesRadioOption` — see PFT body).',
    ],
    expectedAssertions: [
      {
        label: 'Mandatory Yes/No',
        summaryTitle: exceptionalHardship.thereIsAProblemErrorMessageHeader,
        messageContains: exceptionalHardship.selectExceptionHardshipErrorMessage,
      },
      {
        label: 'Max length when details invalid',
        summaryTitle: exceptionalHardship.thereIsAProblemErrorMessageHeader,
        messageContains: exceptionalHardship.mustBe500CharactersOrFewerErrorMessage,
      },
    ],
  };
}

export async function yourExceptionalHardShipErrorValidation(): Promise<void> {
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.selectExceptionHardshipErrorMessage,
  });
  await performAction('clickRadioButton', yourCircumstances.yesRadioOption);
  await performValidation('elementToBeVisible', exceptionalHardship.youCanEnterUpToHiddenHintText);
  await performAction('inputText', exceptionalHardship.giveDetailsHiddenTextLabel, generateRandomString(501));
  await performValidation('elementToBeVisible', exceptionalHardship.tooManyCharacterHiddenHintText);
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.mustBe500CharactersOrFewerErrorMessage,
  });
}

export async function yourExceptionalHardshipNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', exceptionalHardship.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: exceptionalHardship.pageSlug,
  });
  await performValidation('pageNavigation', yourCircumstances.backLink, yourCircumstances.mainHeader);
  await performAction('clickRadioButton', yourCircumstances.noRadioOption);
  await performValidation('pageNavigation', exceptionalHardship.saveForLaterButton, dashboard.mainHeader);
}
