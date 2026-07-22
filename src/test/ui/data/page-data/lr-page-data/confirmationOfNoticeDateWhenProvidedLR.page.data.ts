import { submitCaseApiData } from '../../api-data';

export const noticeDateWhenProvidedLR = {
  mainHeader: `Notice date`,
  backLink: `Back`,
  noticeGivenDateLabel: `They served the defendant with a notice seeking possession on ${convertDateFormat(submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.notice_PostedDate)}`,
  whenMakingClaimHintText: () =>
    `When making the claim, ${process.env.CLAIMANT_NAME} had to say the date they gave the defendant notice (the date of service).`,
  noticeDetailsGivenLabel: () => `Notice details given by ${process.env.CLAIMANT_NAME}:`,
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

  return `${formatOrdinalDay(day)} ${month} ${date.getFullYear()}`;
}

function formatOrdinalDay(day: number): string {
  const lastTwoDigits = day % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
