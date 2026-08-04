import { feedback } from '../../data/page-data';
import { doYouWantToUploadDocumentsToSupportYourApplication } from '../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function doYouWantToUploadDocumentsToSupportYourApplicationErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: doYouWantToUploadDocumentsToSupportYourApplication.errorValidationType.one,
    inputArray: doYouWantToUploadDocumentsToSupportYourApplication.errorValidationField.errorRadioOption,
    header: doYouWantToUploadDocumentsToSupportYourApplication.thereIsAProblemErrorMessageHeader,
    question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
    option: doYouWantToUploadDocumentsToSupportYourApplication.yesRadioOption,
    button: doYouWantToUploadDocumentsToSupportYourApplication.continueButton,
  });
}
export async function doYouWantToUploadDocumentsToSupportYourApplicationNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doYouWantToUploadDocumentsToSupportYourApplication.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: doYouWantToUploadDocumentsToSupportYourApplication.pageSlug,
  });
}
