import { counterClaimOrderOtherThanSum } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimOrderOtherThanSumErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimOrderOtherThanSum.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimOrderOtherThanSum.thereIsAProblemErrorMessageHeader,
    message: counterClaimOrderOtherThanSum.enterWhatOrdersErrorMessage,
  });
  await performValidation('errorMessage', {
    header: counterClaimOrderOtherThanSum.thereIsAProblemErrorMessageHeader,
    message: counterClaimOrderOtherThanSum.enterWhatFactsErrorMessage,
  });
}
