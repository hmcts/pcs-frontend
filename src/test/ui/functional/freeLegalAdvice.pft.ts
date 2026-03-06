import { defendantNameCapture, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function freeLegalAdviceErrorValidation(): Promise<void> {
console.log("inside freeLegalAdvicevalidation")

  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProbelmErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}
