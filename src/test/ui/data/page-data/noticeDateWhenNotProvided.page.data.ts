// import { submitCaseApiData } from '../api-data';

export const noticeDateWhenNotProvided = {
  mainHeader: `Notice date`,
  respondToAPropertyPossessionParagraph: `Respond to a property possession claim`,
  backLink: `Back`,
  didNotProvideNoticeLabel: () => `${process.env.CLAIMANT_NAME} did not provide the date they served you notice.`,
  getWhenDidYouReceiveNoticeQuestion: () => `When did you receive notice from ${process.env.CLAIMANT_NAME} (optional)?`,
  exampleHintText: `For example, 27 9 2022. If you’re not sure of the exact date, you can find it on the notice`,
  dayTextLabel: `Day`,
  monthTextLabel: `Month`,
  yearTextLabel: `Year`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  theDateYouReceiveNoticeErrorMessage: `The date you received notice must either be today’s date or in the past`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `confirmation-of-notice-date-when-not-provided`,
};
