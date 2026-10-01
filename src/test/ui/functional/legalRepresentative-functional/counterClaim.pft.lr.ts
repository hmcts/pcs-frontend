import { counterClaim } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', counterClaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaim.thereIsAProblemErrorMessageHeader,
    message: counterClaim.selectIfDefendantPlanningToMakeClaimErrorMessage,
  });
}
