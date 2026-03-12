import { defendantNameCapture, freeLegalAdvice, startNow } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function freeLegalAdviceErrorValidation(): Promise<void> {
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProblemErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}

export async function freeLegalAdviceNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', freeLegalAdvice.backLink, startNow.mainHeader);
  await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, 'Dashboard');
}
