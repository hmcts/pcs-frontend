import { defendantNameCapture } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(61);
export async function defendantNameCaptureErrorValidation(): Promise<void> {
  // Test: Both first name and last name text fields are empty
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    messages: [defendantNameCapture.enterYourFirstNameErrorMessage, defendantNameCapture.enterYourLastNameErrorMessage],
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

export async function defendantNameCaptureNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantNameConfirmation.backLink, freeLegalAdvice.mainHeader);
  await defendantNameCaptureInputValuesPrePopulated();
}

export async function defendantNameCaptureInputValuesPrePopulated(): Promise<void> {
  await performAction('inputText', defendantNameCapture.firstNameLabelText, defendantNameCapture.firstNameInputText);
  await performAction('inputText', defendantNameCapture.lastNameLabelText, defendantNameCapture.lastNameInputText);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, 'Dashboard');
  await performValidation(
    'inputTextValue',
    defendantNameCapture.firstNameLabelText,
    defendantNameCapture.firstNameInputText
  );
  await performValidation(
    'inputTextValue',
    defendantNameCapture.lastNameLabelText,
    defendantNameCapture.lastNameInputText
  );
}
