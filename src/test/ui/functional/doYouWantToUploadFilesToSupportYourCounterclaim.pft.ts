import { doYouWantToUploadFilesToSupportYourCounterclaim } from '../data/page-data';
import { doYouWantToUploadDocumentToSupportYourApplication } from '../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../utils/controller';

export async function doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouWantToUploadDocumentToSupportYourApplication.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouWantToUploadFilesToSupportYourCounterclaim.thereIsAProblemErrorMessageHeader,
    message: doYouWantToUploadFilesToSupportYourCounterclaim.selectIfYouWantToUploadErrorMessage,
  });
}
