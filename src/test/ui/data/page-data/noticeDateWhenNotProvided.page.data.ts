import { submitCaseApiData } from '../api-data';

export const noticeDateWhenNotProvided = {
  mainHeader: `Notice date`,
  respondToAPropertyPossessionParagraph: `Respond to a property possession claim`,
  backLink: `Back`,
  didNotProvideNoticeLabel: `${submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName} did not provide the date they served you notice.`,
  getWhenDidYouReceiveNoticeQuestion: (claimantsName: string) =>
    `When did you receive notice from ${claimantsName} (optional)?`,
  exampleHintText: `For example, 27 9 2022. If you’re not sure of the exact date, you can find it on the notice`,
  dayTextLabel: `Day`,
  monthTextLabel: `Month`,
  yearTextLabel: `Year`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  theDateYouReceiveNoticeErrorMessage: `The date you received notice must either be today’s date or in the past`,
};
