import {
  counterClaimAbout,
  dashboard,
  doYouWantToUploadFilesToSupportYourCounterclaim,
  feedback,
} from '../data/page-data';
import { counterClaimHaveYouAppliedForHelp } from '../data/page-data/counterClaimHaveYouAppliedForHelp.page.data';
import { doYouWantToUploadDocumentToSupportYourApplication } from '../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../utils/controller';

export async function doYouWantToUploadFilesToSupportYourCounterclaimErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouWantToUploadDocumentToSupportYourApplication.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouWantToUploadFilesToSupportYourCounterclaim.thereIsAProblemErrorMessageHeader,
    message: doYouWantToUploadFilesToSupportYourCounterclaim.selectIfYouWantToUploadErrorMessage,
  });
}

export async function doYouWantToUploadFilesToSupportYourCounterclaimNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doYouWantToUploadDocumentToSupportYourApplication.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: doYouWantToUploadDocumentToSupportYourApplication.pageSlug,
  });

  if (process.env.I_NEED_HELP === 'NO') {
    await performValidation(
      'pageNavigation',
      doYouWantToUploadDocumentToSupportYourApplication.backLink,
      counterClaimAbout.mainHeader
    );
  } else if (process.env.I_NEED_HELP === 'YES') {
    await performValidation(
      'pageNavigation',
      doYouWantToUploadDocumentToSupportYourApplication.backLink,
      counterClaimHaveYouAppliedForHelp.mainHeader
    );
  }
  await performAction('clickRadioButton', doYouWantToUploadDocumentToSupportYourApplication.noRadioOption);
  await performValidation(
    'pageNavigation',
    doYouWantToUploadDocumentToSupportYourApplication.saveForLaterButton,
    dashboard.mainHeader
  );
}
