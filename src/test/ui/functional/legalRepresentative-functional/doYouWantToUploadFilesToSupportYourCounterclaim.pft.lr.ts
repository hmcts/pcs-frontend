import { doYouWantToUploadFilesToSupportYourCounterclaim } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouWantToUploadFilesToSupportYourCounterclaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouWantToUploadFilesToSupportYourCounterclaim.thereIsAProblemErrorMessageHeader,
    message: doYouWantToUploadFilesToSupportYourCounterclaim.selectIfYouWantToUploadErrorMessage,
  });
}
