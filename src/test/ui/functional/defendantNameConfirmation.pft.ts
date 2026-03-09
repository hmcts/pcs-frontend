import { defendantNameConfirmation } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(61);

export async function defendantNameConfirmationErrorValidation(): Promise<void> {
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
  // Test: First name empty and last name over max length
  await performAction('inputText', defendantNameConfirmation.lastNameHiddenLabelText, overMaxLengthString);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterYourFirstNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterLastNameMaxLengthErrorMessage,
  });
  // Test: Both first name and last name over max length
  await performAction('inputText', defendantNameConfirmation.firstNameHiddenLabelText, overMaxLengthString);
  await performAction('inputText', defendantNameConfirmation.lastNameHiddenLabelText, overMaxLengthString);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterFirstNameMaxLengthErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterLastNameMaxLengthErrorMessage,
  });
}
