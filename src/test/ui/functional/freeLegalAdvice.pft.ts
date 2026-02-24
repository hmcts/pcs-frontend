import { defendantNameCapture, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function freeLegalAdviceErrorValidation(): Promise<void> {
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProbelmErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}
