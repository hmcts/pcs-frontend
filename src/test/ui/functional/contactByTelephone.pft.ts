import { contactByTelephone } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactByTelephoneErrorValidation(): Promise<void> {
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
  });
  await performAction('clickRadioButton', contactByTelephone.yesRadioOption);
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberErrorMessage,
  });
  await performAction(
    'inputText',
    contactByTelephone.ukPhoneNumberHiddenTextLabel,
    contactByTelephone.invalidUkPhoneNumberTextInput
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction(
    'inputText',
    contactByTelephone.ukPhoneNumberHiddenTextLabel,
    contactByTelephone.ukPhoneNumberMoreThan11DigitTextInput
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
  await performAction(
    'inputText',
    contactByTelephone.ukPhoneNumberHiddenTextLabel,
    contactByTelephone.ukPhoneNumberWithCountryCodeTextInput
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberFormatErrorMessage,
  });
}
