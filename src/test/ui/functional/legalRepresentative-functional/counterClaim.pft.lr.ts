import { counterClaim } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaim.thereIsAProblemErrorMessageHeader,
    message: counterClaim.selectIfDefendantPlanningToMakeClaimErrorMessage,
  });
}
