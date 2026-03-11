import { defendantNameCapture, defendantNameConfirmation } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(61);
export async function defendantNameConfirmationErrorValidation(): Promise<void> {
  // Test: Error message validation for mandatory radio button selection
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    messages: defendantNameConfirmation.nameErrorMessage,
  });
  // Test: Both first name and last name text fields are empty
  await performAction('clickRadioButton', defendantNameConfirmation.noRadioOption);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterYourFirstNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterYourLastNameErrorMessage,
  });
  //Test: First name empty and last name over max length
  await performAction('inputText', defendantNameCapture.lastNameTextLabel, overMaxLengthString);
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.enterYourFirstNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.enterLastNameMaxLengthErrorMessage,
  });
  //Test: Both first name and last name over max length
  await performAction('inputText', defendantNameCapture.firstNameTextLabel, overMaxLengthString);
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.enterFirstNameMaxLengthErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.enterFirstNameMaxLengthErrorMessage,
  });
}
