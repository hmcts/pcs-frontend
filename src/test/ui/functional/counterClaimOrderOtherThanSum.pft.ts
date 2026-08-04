import { counterClaimOrderOtherThanSum } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
//Navigation tests will be enabled once all routing tickets is done
/*export async function counterClaimOrderOtherThanSumNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimOrderOtherThanSum.backLink, counterClaimAbout.mainHeader);
}*/
