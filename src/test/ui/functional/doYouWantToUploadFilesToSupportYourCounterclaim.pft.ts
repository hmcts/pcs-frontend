import { counterClaimAbout, doYouWantToUploadFilesToSupportYourCounterclaim, feedback } from '../data/page-data';
import { counterClaimHaveYouAppliedForHelp } from '../data/page-data/counterClaimHaveYouAppliedForHelp.page.data';
import { performAction, performValidation } from '../utils/controller';

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
    pageSlug: doYouWantToUploadFilesToSupportYourCounterclaim.pageSlug,
  });

  if (process.env.I_NEED_HELP === 'NO') {
    await performValidation(
      'pageNavigation',
      doYouWantToUploadFilesToSupportYourCounterclaim.backLink,
      counterClaimAbout.mainHeader
    );
  } else if (process.env.I_NEED_HELP === 'YES') {
    await performValidation(
      'pageNavigation',
      doYouWantToUploadFilesToSupportYourCounterclaim.backLink,
      counterClaimHaveYouAppliedForHelp.mainHeader
    );
  }
  await performAction('clickRadioButton', doYouWantToUploadFilesToSupportYourCounterclaim.noRadioOption);
}
