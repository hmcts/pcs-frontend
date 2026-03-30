import { submitCaseApiData } from '../data/api-data';
import { disputeClaimInterstitial, feedback, landlordRegistered } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function landlordRegisteredErrorValidation(): Promise<void> {
  await performAction('clickButton', landlordRegistered.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: landlordRegistered.thereIsAProblemErrorMessageHeader,
    message: landlordRegistered.selectIfYouAgreeWithLandlordsClaimRegisteredErrorMessage,
  });
}

export async function landlordRegisteredNavigationTests(): Promise<void> {
  const claimantsName = submitCaseApiData.submitCasePayload.claimantName;
  await performValidation('pageNavigation', landlordRegistered.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: landlordRegistered.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    landlordRegistered.backLink,
    disputeClaimInterstitial.getMainHeader(claimantsName)
  );
  // --skipping this below line until pageNavigation validation supports to window handling-- story created HDPI-5329 in QA improvements board.
  //await performValidation('pageNavigation', registeredLandlord.publicRegisterLink,'Public Register');
  await performAction('clickRadioButton', landlordRegistered.yesRadioOption);
  await performValidation('pageNavigation', landlordRegistered.saveForLaterButton, landlordRegistered.mainHeader);
}
