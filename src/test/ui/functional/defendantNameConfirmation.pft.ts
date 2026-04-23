import { defendantNameConfirmation, feedback, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

import { defendantNameCaptureInputValuesPrePopulated } from './defendantNameCapture.pft';

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
  await performAction('inputText', defendantNameConfirmation.lastNameHiddenTextLabel, overMaxLengthString);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterYourFirstNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterLastNameMaxLengthErrorMessage,
  });
  //Test: Both first name and last name over max length
  await performAction('inputText', defendantNameConfirmation.firstNameHiddenTextLabel, overMaxLengthString);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterFirstNameMaxLengthErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterFirstNameMaxLengthErrorMessage,
  });
}
export async function defendantNameConfirmationNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantNameConfirmation.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: defendantNameConfirmation.pageSlug,
  });
  await performValidation('pageNavigation', defendantNameConfirmation.backLink, freeLegalAdvice.mainHeader);
  await performAction('clickRadioButton', {
    question: defendantNameConfirmation.mainHeader,
    option: defendantNameConfirmation.noRadioOption,
  });
  await defendantNameCaptureInputValuesPrePopulated();
}
