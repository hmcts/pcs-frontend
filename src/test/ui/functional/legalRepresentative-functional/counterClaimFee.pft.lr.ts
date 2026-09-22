import { counterClaimFee } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';
export async function counterClaimFeeErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimFee.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimFee.thereIsAProblemErrorMessageHeader,
    message: counterClaimFee.selectIfYouNeedHelpErrorMessage,
  });
}
