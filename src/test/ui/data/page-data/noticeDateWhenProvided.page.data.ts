import { submitCaseApiData } from '../api-data';

export const noticeDateWhenProvided = {
  mainHeader: `Notice date`,
  respondToAPropertyPossessionParagraph: `Respond to a property possession claim`,
  backLink: `Back`,
  whenMakingClaimHintText: (claimantName: string) => `When making the claim, ${claimantName} had to say the date they gave you notice (the date of service). If you’re not sure of the exact date, you can find it on the notice.`,
  noticeDetailsGivenLabel: (claimantName: string) => `Notice details given by ${claimantName}:`,
  noticeGivenDateLabel: `They served you with a notice seeking possession on ${convertDateFormat(submitCaseApiData.submitCasePayload.notice_NoticePostedDate)}`,
  getWhenDidYouReceiveNoticeQuestion: (claimantName: string) =>
    `When did you receive notice from ${claimantName} (optional)?`,
  exampleHintText: `For example, 27 9 2022`,
  dayTextLabel: `Day`,
  monthTextLabel: `Month`,
  yearTextLabel: `Year`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  theDateYouReceiveNoticeErrorMessage: `The date you received notice must either be today’s date or in the past`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `confirmation-of-notice-date-when-provided`,
};

export function convertDateFormat(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString(`en-US`, { month: `long` });

  return `${day} ${month} ${date.getFullYear()}`;
}
