import { submitCaseApiData } from '../api-data';

export type NoticeMethodPayload = {
  notice_ServiceMethod?: string;
  notice_DeliveredDate?: string;
  notice_PersonName?: string;
  notice_EmailAddress?: string | null;
  notice_OtherElectronicDetails?: string;
  notice_OtherExplanation?: string;
};

export const noticeDateWhenProvided = {
  mainHeader: `Notice date`,
  backLink: `Back`,
  whenMakingClaimHintText: () =>
    `When they made their claim, ${process.env.CLAIMANT_NAME} had to say the date they gave you notice (the date of service). If you’re not sure of the exact date, you can find it on the notice.`,
  noticeDetailsGivenLabel: () => `Notice details given by ${process.env.CLAIMANT_NAME}:`,
  noticeGivenDateLabel: `they served notice on ${convertDateFormat(submitCaseApiData.submitCasePayload.notice_PostedDate)}`,
  noticeDocumentLink: `View a copy of the notice (opens in new tab)`,
  noticeGivenDateHiddenLabelLR: `They served the defendant with a notice seeking possession on ${convertDateFormat(submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.notice_PostedDate)}`,
  getWhenDidYouReceiveNoticeQuestion: `When did you receive notice from ${process.env.CLAIMANT_NAME} (optional)?`,
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

export function noticeServiceMethodText(payload: NoticeMethodPayload): string {
  switch (payload.notice_ServiceMethod) {
    case 'FIRST_CLASS_POST':
      return 'the notice was served by first class post or other service which provides for delivery on the next working day';
    case 'DELIVERED_PERMITTED_PLACE':
      return `the notice was served by delivering it to or leaving it at a permitted place on ${convertDateFormat(payload.notice_DeliveredDate as string)}`;
    case 'PERSONALLY_HANDED':
      return `the notice was served by personally handing it to or leaving it with ${payload.notice_PersonName}`;
    case 'EMAIL':
      return `the notice was served by email to ${payload.notice_EmailAddress}`;
    case 'OTHER_ELECTRONIC':
      return `the notice was served by other electronic method: ${payload.notice_OtherElectronicDetails}`;
    case 'OTHER':
      return `the notice was served by other means: ${payload.notice_OtherExplanation}`;
    default:
      throw new Error(`Unsupported notice service method: ${payload.notice_ServiceMethod}`);
  }
}

export function convertDateFormat(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString(`en-US`, { month: `long` });

  return `${day} ${month} ${date.getFullYear()}`;
}
