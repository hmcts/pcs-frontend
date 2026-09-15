import { feedback } from '../../data/page-data';
import { counterClaimAbout, doYouWantToUploadFilesToSupportYourCounterclaim } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouWantToUploadFilesToSupportYourCounterclaim.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouWantToUploadFilesToSupportYourCounterclaim.thereIsAProblemErrorMessageHeader,
    message: doYouWantToUploadFilesToSupportYourCounterclaim.selectIfYouWantToUploadErrorMessage,
  });
}

export async function doYouWantToUploadFilesToSupportYourCounterclaimNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doYouWantToUploadFilesToSupportYourCounterclaim.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    feedbackPageUrl: `respond-to-claim/${doYouWantToUploadFilesToSupportYourCounterclaim.pageSlug}`,
  });
  await performValidation(
    'pageNavigation',
    doYouWantToUploadFilesToSupportYourCounterclaim.backLink,
    counterClaimAbout.mainHeader
  );
}
