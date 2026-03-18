import { submitCaseApiData } from '../data/api-data';
import { confirmationOfNoticeGiven, dashboard, tenancyDateUnknown } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;

export async function confirmationOfNoticeGivenErrorValidation(): Promise<void> {
  await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: confirmationOfNoticeGiven.thereIsAProblemErrorMessageHeader,
    message: confirmationOfNoticeGiven.selectIfNoticeOfIntentionGivenErrorMessage(claimantName),
  });
}

export async function confirmationOfNoticeGivenNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', confirmationOfNoticeGiven.backLink, tenancyDateUnknown.mainHeader);
  await performAction('clickRadioButton', confirmationOfNoticeGiven.yesRadioOption);
  await performValidation('pageNavigation', confirmationOfNoticeGiven.saveForLaterButton, dashboard.mainHeader);
}
