import { counterClaimWhatAreYouClaimingFor } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimWhatAreYouClaimingForErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', counterClaimWhatAreYouClaimingFor.saveAndContinueButton);
  console.log(`clicked save and continue without selecting any option`);

  await performValidation('errorMessage', {
    header: counterClaimWhatAreYouClaimingFor.thereIsAProblemErrorMessageHeader,
    message: counterClaimWhatAreYouClaimingFor.sumOfMoneyErrorMessage,
  });
}
