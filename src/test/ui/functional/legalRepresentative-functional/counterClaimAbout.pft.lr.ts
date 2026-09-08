import { counterClaimAbout } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterClaimAboutErrorValidation(): Promise<void> {
  await performAction('clickButton', counterClaimAbout.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimAbout.thereIsAProblemErrorMessageHeader,
    message: counterClaimAbout.enterWhatYourCounterClaimErrorMessage,
  });
  await performValidation('errorMessage', {
    header: counterClaimAbout.thereIsAProblemErrorMessageHeader,
    message: counterClaimAbout.enterWhatYourReasonsAreForErrorMessage,
  });
}
