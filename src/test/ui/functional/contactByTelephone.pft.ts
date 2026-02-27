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
    contactByTelephone.inputInvalidUkPhoneNumber
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberErrorMessage,
  });
  await performAction(
    'inputText',
    contactByTelephone.ukPhoneNumberHiddenTextLabel,
    contactByTelephone.inputUkPhoneNumberMoreThan11Digit
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberErrorMessage,
  });
  await performAction(
    'inputText',
    contactByTelephone.ukPhoneNumberHiddenTextLabel,
    contactByTelephone.inputUkIncorrectNumber
  );
  await performAction('clickButton', contactByTelephone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTelephone.thereIsAProblemErrorMessageHeader,
    message: contactByTelephone.enterUKPhoneNumberErrorMessage,
  });
}
