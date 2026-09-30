import { exemptLandlord } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function exemptLandLordErrorValidation(): Promise<void> {
  await performAction('clickButton', exemptLandlord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exemptLandlord.thereIsAProblemErrorMessageHeader,
    message: exemptLandlord.selectIfYouAgreeWithExemptLandLordErrorMessage,
  });
}
