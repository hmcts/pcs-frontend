import { dashboard, defendantNameCapture, feedback, freeLegalAdvice } from '../data/page-data';
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
  await performAction('inputText', defendantNameCapture.lastNameTextLabel, overMaxLengthString);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.enterLastNameMaxLengthErrorMessage,
  });

  //Test: Both first name and last name for emoji
  await performAction('inputText', defendantNameCapture.firstNameTextLabel, defendantNameCapture.emojiTextInput);
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.emojiFirstNameErrorMessage,
  });
  await performAction('inputText', defendantNameCapture.lastNameTextLabel, defendantNameCapture.emojiTextInput);
  await performValidation('errorMessage', {
    header: defendantNameCapture.thereIsAProblemErrorMessageHeader,
    message: defendantNameCapture.emojiLastNameErrorMessage,
  });
}
export async function defendantNameCaptureNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantNameCapture.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: defendantNameCapture.pageSlug,
  });
  await performValidation('pageNavigation', defendantNameCapture.backLink, freeLegalAdvice.mainHeader);
  await defendantNameCaptureInputValuesPrePopulated();
}

export async function defendantNameCaptureInputValuesPrePopulated(): Promise<void> {
  await performAction('inputText', defendantNameCapture.firstNameTextLabel, defendantNameCapture.firstNameTextInput);
  await performAction('inputText', defendantNameCapture.lastNameTextLabel, defendantNameCapture.lastNameTextInput);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, dashboard.mainHeader);
  await performValidation(
    'inputTextValue',
    defendantNameCapture.firstNameTextLabel,
    defendantNameCapture.firstNameTextInput
  );
  await performValidation(
    'inputTextValue',
    defendantNameCapture.lastNameTextLabel,
    defendantNameCapture.lastNameTextInput
  );
}
