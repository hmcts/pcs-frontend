import { exemptLandLord } from '../../data/page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function exemptLandLordErrorValidation(): Promise<void> {
  await performAction('clickButton', exemptLandLord.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exemptLandLord.thereIsAProblemErrorMessageHeader,
    message: exemptLandLord.selectIfYouAgreeWithExemptLandLordErrorMessage,
  });
}
