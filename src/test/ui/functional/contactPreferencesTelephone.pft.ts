import { contactPreferenceEmailOrPost, contactPreferencesTelephone, dashboard } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
  await performValidation(
    'pageNavigation',
    contactPreferencesTelephone.backLink,
    contactPreferenceEmailOrPost.mainHeader
  );
  await performAction('clickRadioButton', contactPreferencesTelephone.noRadioOption);
  await performValidation('pageNavigation', contactPreferencesTelephone.saveForLaterButton, dashboard.mainHeader());
}
