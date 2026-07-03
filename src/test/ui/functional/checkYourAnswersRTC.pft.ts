import { checkYourAnswersRTC } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function checkYourAnswersRTCErrorValidation(): Promise<void> {
  await performAction('clickButton', checkYourAnswersRTC.submitButton);
  await performValidation('errorMessage', {
    header: checkYourAnswersRTC.thereIsAProblemErrorMessageHeader,
    message: checkYourAnswersRTC.ifYouUnderstandErrorMessage,
  });
  await performValidation('errorMessage', {
    header: checkYourAnswersRTC.thereIsAProblemErrorMessageHeader,
    message: checkYourAnswersRTC.ifYouBelieveErrorMessage,
  });
  await performValidation('errorMessage', {
    header: checkYourAnswersRTC.thereIsAProblemErrorMessageHeader,
    message: checkYourAnswersRTC.yourFullNameErrorMessage,
  });
}
