import { counterClaimAgainstWhom } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimAgainstWhomErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', counterClaimAgainstWhom.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAgainstWhom.thereIsAProblemErrorMessageHeader,
    message: counterClaimAgainstWhom.selectWhoYouAreMakingErrorMessage,
  });
}
