import { selectDefendant } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function selectDefendantErrorValidation(): Promise<void> {
  await performAction('clickButton', selectDefendant.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: selectDefendant.thereIsAProblemErrorMessageHeader,
    message: selectDefendant.selectWhoYouAreMakingErrorMessage,
  });
}
