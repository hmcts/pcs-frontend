import { contactByPhone } from '../../data/page-data';
import { performAction, performValidation } from '../../utils/controller';

export default async function contactByTelephoneErrorValidation(): Promise<void> {
  await performAction('clickButton', contactByPhone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByPhone.thereIsAProblemErrorMessageHeader,
    message: contactByPhone.selectWhetherHappyToBeContactedByTelephoneErrorMessage,
  });
  await performAction('clickRadioButton', contactByPhone.yesRadioOption);
  await performAction('clickButton', contactByPhone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByPhone.thereIsAProblemErrorMessageHeader,
    message: contactByPhone.enterUKPhoneNumberErrorMessage,
  });
  await performAction('inputText', contactByPhone.ukPhoneNumberHiddenTextLabel, '7ab00 90*2£&');
  await performAction('clickButton', contactByPhone.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByPhone.thereIsAProblemErrorMessageHeader,
    message: contactByPhone.enterUKPhoneNumberErrorMessage,
  });
}
