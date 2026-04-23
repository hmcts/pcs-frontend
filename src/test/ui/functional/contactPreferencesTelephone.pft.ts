import { contactPreferenceEmailOrPost, contactPreferencesTelephone, dashboard, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function contactPreferencesTelephoneMandatoryChoiceErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent: 'Telephone preference must be answered; journey then chooses “No” (not the full UK-number format PFT).',
    screenTitle: contactPreferencesTelephone.mainHeader,
    actionsOrInputs: ['Click “Save and continue” without choosing Yes or No.'],
    expectedAssertions: [
      {
        label: 'Telephone choice required',
        summaryTitle: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
        messageContains: contactPreferencesTelephone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
      },
    ],
  };
}

/** Save without choosing telephone yes/no (for journeys that then pick “no”). */
export async function contactPreferencesTelephoneMandatoryChoiceErrorValidation(): Promise<void> {
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
  });
}

export async function contactPreferencesTelephoneErrorValidation(): Promise<void> {
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
  });
  await performAction('clickRadioButton', contactPreferencesTelephone.yesRadioOption);
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel,
    contactPreferencesTelephone.invalidUkPhoneNumberTextInput
  );
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel,
    contactPreferencesTelephone.ukPhoneNumberMoreThan11DigitTextInput
  );
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel,
    contactPreferencesTelephone.ukPhoneNumberWithCountryCodeTextInput
  );
  await performAction('clickButton', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
}

export async function contactPreferencesTelephoneNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', contactPreferencesTelephone.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: contactPreferencesTelephone.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    contactPreferencesTelephone.backLink,
    contactPreferenceEmailOrPost.mainHeader
  );
  await performAction('clickRadioButton', contactPreferencesTelephone.noRadioOption);
  await performValidation('pageNavigation', contactPreferencesTelephone.saveForLaterButton, dashboard.mainHeader);
}
