import { contactPreferencesTelephone } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactPreferencesTelephoneErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
  });
  await performAction('clickRadioButton', contactPreferencesTelephone.yesRadioOption);
  await performAction('When the user clicks the button', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberErrorMessage,
  });
  await performAction('inputText', contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel, contactPreferencesTelephone.invalidUkPhoneNumberTextInput);
  await performAction('When the user clicks the button', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction('inputText', contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel, contactPreferencesTelephone.ukPhoneNumberMoreThan11DigitTextInput);
  await performAction('When the user clicks the button', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction('inputText', contactPreferencesTelephone.ukPhoneNumberHiddenTextLabel, contactPreferencesTelephone.ukPhoneNumberWithCountryCodeTextInput);
  await performAction('When the user clicks the button', contactPreferencesTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTelephone.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
}

// Needs to be enabled after counterclaim journey is implemented
/*
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
}
 */
