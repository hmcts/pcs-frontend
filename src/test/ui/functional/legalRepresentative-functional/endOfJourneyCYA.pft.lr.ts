import { endOfJourneyCYA } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function endOfJourneyCYAErrorValidation(): Promise<void> {
  await performAction('clickButton', endOfJourneyCYA.submitButton);
  await performValidation('errorMessage', {
    header: endOfJourneyCYA.thereIsAProblemErrorMessageHeader,
    message: endOfJourneyCYA.yourFullNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: endOfJourneyCYA.thereIsAProblemErrorMessageHeader,
    message: endOfJourneyCYA.firmNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: endOfJourneyCYA.thereIsAProblemErrorMessageHeader,
    message: endOfJourneyCYA.enterPositionErrorMessage,
  });
  await performValidation('errorMessage', {
    header: endOfJourneyCYA.thereIsAProblemErrorMessageHeader,
    message: endOfJourneyCYA.selectIfDefendantBelieveErrorMessage,
  });
}
