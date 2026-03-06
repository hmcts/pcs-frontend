import { contactPreference } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactPreferenceErrorValidation(): Promise<void> {
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.selectHowYouWantToReceiveUpdatesErrorMessage,
  });
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.enterEmailAddressErrorMessage,
  });
  await performAction('clickRadioButton', contactPreference.byEmailRadioOption);
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.enterEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreference.enterEmailAddressHiddenTextLabel,
    contactPreference.invalidEmailAddressErrorMessage
  );
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreference.enterEmailAddressHiddenTextLabel,
    contactPreference.emailAddressWithMoreThan250CharTextInput
  );
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreference.enterEmailAddressHiddenTextLabel,
    contactPreference.emailAddressWithSpecialCharTextInput
  );
  await performAction('clickButton', contactPreference.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreference.thereIsAProblemErrorMessageHeader,
    message: contactPreference.invalidEmailAddressErrorMessage,
  });
}
