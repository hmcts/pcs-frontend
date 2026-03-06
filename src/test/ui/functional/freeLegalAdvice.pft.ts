import { defendantNameCapture, freeLegalAdvice, startNow } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function freeLegalAdviceErrorValidation(): Promise<void> {
console.log("inside freeLegalAdvicevalidation")

  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProbelmErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}

export async function freeLegalAdviceNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', freeLegalAdvice.backLink, startNow.mainHeader);
  await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
  await performValidation('pageNavigation', freeLegalAdvice.saveForLaterButton, 'Dashboard');
}
