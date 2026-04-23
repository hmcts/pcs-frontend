import { confirmationOfNoticeGiven, dashboard, feedback, tenancyDateUnknown } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

/*FYI : Below code is disabled due to https://tools.hmcts.net/jira/browse/HDPI-6087
let claimantName = '';

if (process.env.CLAIMANT_NAME_OVERRIDDEN === 'YES') {
  claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
} else {
  claimantName = submitCaseApiData.submitCasePayloadNoDefendants.claimantName;
}

export async function confirmationOfNoticeGivenErrorValidation(): Promise<void> {
  await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: confirmationOfNoticeGiven.thereIsAProblemErrorMessageHeader,
    message: confirmationOfNoticeGiven.selectIfNoticeOfIntentionGivenErrorMessage(claimantName),
  });
}*/

export async function confirmationOfNoticeGivenNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', confirmationOfNoticeGiven.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: confirmationOfNoticeGiven.pageSlug,
  });
  await performValidation('pageNavigation', confirmationOfNoticeGiven.backLink, tenancyDateUnknown.mainHeader);
  await performAction('clickRadioButton', confirmationOfNoticeGiven.yesRadioOption);
  await performValidation('pageNavigation', confirmationOfNoticeGiven.saveForLaterButton, dashboard.mainHeader);
}
