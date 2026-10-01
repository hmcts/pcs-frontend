import { selectDefendant } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function selectDefendantErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', selectDefendant.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: selectDefendant.thereIsAProblemErrorMessageHeader,
    message: selectDefendant.selectWhoYouAreMakingErrorMessage,
  });
}
