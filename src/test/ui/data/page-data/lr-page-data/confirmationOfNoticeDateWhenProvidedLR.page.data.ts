import { submitCaseApiData } from '../../api-data';


export const noticeDateWhenProvided = {
  mainHeader: `Notice date`,
  backLink: `Back`,
  whenMakingClaimHintText: () =>
    `When making the claim, ${process.env.CLAIMANT_NAME} had to say the date they gave the defendant notice (the date of service).`,
  noticeDetailsGivenLabel: () => `Notice details given by ${process.env.CLAIMANT_NAME}:`,
  noticeGivenDateLabel: `They served the defendant with a notice seeking possession on ${convertDateFormat(submitCaseApiData.submitCasePayload.notice_PostedDate)}`,
  getWhenDidYouReceiveNoticeQuestion: `When did the defendant receive notice from ${process.env.CLAIMANT_NAME} (optional)?`,
  exampleHintText: `For example, 27 9 2022`,
  dayTextLabel: `Day`,
  monthTextLabel: `Month`,
  yearTextLabel: `Year`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  theDateDefendantReceivedNoticeErrorMessage: `The date the defendant received notice must either be today’s date or in the past`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `confirmation-of-notice-date-when-provided`,
};

export function convertDateFormat(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString(`en-US`, { month: `long` });

  return `${day} ${month} ${date.getFullYear()}`;
}
