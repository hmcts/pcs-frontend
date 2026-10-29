import { submitCaseApiData } from '../../data/api-data';
import { confirmationOfNoticeGiven } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

function getClaimantName(): string {
  return process.env.CLAIMANT_NAME ?? submitCaseApiData.submitCasePayloadNoDefendants.claimantName;
}

export async function confirmationOfNoticeGivenErrorValidation(): Promise<void> {
  await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: confirmationOfNoticeGiven.thereIsAProblemErrorMessageHeader,
    message: confirmationOfNoticeGiven.selectIfNoticeOfIntentionGivenErrorMessage(getClaimantName()),
  });
}
