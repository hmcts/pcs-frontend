import { defendantNameCapture, defendantNameConfirmation, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function defendantNameCaptureNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantNameConfirmation.backLink, freeLegalAdvice.mainHeader);
  await this.defendantNameCaptureInputValuesPrePopulated();
}

export async function defendantNameCaptureInputValuesPrePopulated(): Promise<void> {
  await performAction('inputText', defendantNameCapture.firstNameLabelText, defendantNameCapture.firstNameInputText);
  await performAction('inputText', defendantNameCapture.lastNameLabelText, defendantNameCapture.lastNameInputText);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, 'Dashboard');
  await performValidation(
    'inputValue',
    defendantNameCapture.firstNameLabelText,
    defendantNameCapture.firstNameInputText
  );
  await performValidation('inputValue', defendantNameCapture.lastNameLabelText, defendantNameCapture.lastNameInputText);
}
