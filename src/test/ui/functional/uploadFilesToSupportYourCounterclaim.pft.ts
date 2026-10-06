import { doYouWantToUploadFilesToSupportYourCounterclaim, feedback, uploadFilesToSupportYourCounterclaim } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
export async function uploadFilesToSupportYourCounterclaimErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', uploadFilesToSupportYourCounterclaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: uploadFilesToSupportYourCounterclaim.thereIsAProblemErrorMessageHeader,
    message: uploadFilesToSupportYourCounterclaim.selectAFileErrorMessage,
  });
}

export async function uploadFilesToSupportYourCounterclaimNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', uploadFilesToSupportYourCounterclaim.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: uploadFilesToSupportYourCounterclaim.pageSlug,
  });

  await performValidation('pageNavigation', uploadFilesToSupportYourCounterclaim.backLink, doYouWantToUploadFilesToSupportYourCounterclaim.mainHeader);
}
