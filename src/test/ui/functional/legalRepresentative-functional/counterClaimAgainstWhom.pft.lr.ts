import { counterClaimAgainstWhom } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimAgainstWhomErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAgainstWhom.thereIsAProblemErrorMessageHeader,
    message: counterClaimAgainstWhom.selectWhoYouAreMakingErrorMessage,
  });
}
