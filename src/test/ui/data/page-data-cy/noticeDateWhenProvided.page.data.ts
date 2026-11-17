import { convertDateFormat } from '../../utils/common/date.utils';
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
  mainHeader: `Dyddiad yr hysbysiad`,
  backLink: `Yn ôl`,
  whenMakingClaimHintText: () =>
    `Pan wnaethant wneud eu hawliad, roedd yn rhaid i ${process.env.CLAIMANT_NAME} roi’r dyddiad pan wnaethant roi’r hysbysiad i chi (y dyddiad cyflwyno). Os nad ydych yn siŵr o’r union ddyddiad, gallwch ddod o hyd iddo ar yr hysbysiad.`,
  noticeDetailsGivenLabel: () => `Manylion yr hysbysiad a roddwyd gan ${process.env.CLAIMANT_NAME}:`,
  noticeGivenDateLabel: `gwnaethant gyflwyno hysbysiad ar ${convertDateFormat(submitCaseApiData.submitCasePayload.notice_PostedDate)}`,
  noticeDocumentDynamicLink: `Gweld copi o’r hysbysiad (yn agor mewn tab newydd)`,
  getWhenDidYouReceiveNoticeQuestion: `Pryd gawsoch yr hysbysiad gan ${process.env.CLAIMANT_NAME} (dewisol)?`,
  exampleHintText: `Er enghraifft, 27 9 2022`,
  dayTextLabel: `Diwrnod`,
  monthTextLabel: `Mis`,
  yearTextLabel: `Blwyddyn`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  signOutLink: `Allgofnodi`,
  thereIsAProblemErrorMessageHeader: `Mae problem`,
  theDateYouReceiveNoticeErrorMessage: `Rhaid i'r dyddiad y cawsoch yr hysbysiad fod yn ddyddiad heddiw neu yn y gorffennol`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `confirmation-of-notice-date-when-provided`,
};

export function noticeServiceMethodText(payload: NoticeMethodPayload): string {
  switch (payload.notice_ServiceMethod) {
    case 'FIRST_CLASS_POST':
      return 'cyflwynwyd yr hysbysiad drwy bost dosbarth cyntaf neu wasanaeth arall sy’n danfon erbyn y diwrnod gwaith nesaf';
    case 'DELIVERED_PERMITTED_PLACE':
      return `cyflwynwyd yr hysbysiad drwy ei ddanfon i neu ei adael mewn man a ganiateir ar ${convertDateFormat(payload.notice_DeliveredDate as string)}`;
    case 'PERSONALLY_HANDED':
      return `cyflwynwyd yr hysbysiad drwy ei roi’n bersonol i ${payload.notice_PersonName} neu ei adael gyda nhw`;
    case 'EMAIL':
      return `cyflwynwyd yr hysbysiad drwy e-bost at ${payload.notice_EmailAddress}`;
    case 'OTHER_ELECTRONIC':
      return `cyflwynwyd yr hysbysiad drwy ddull electronig arall: ${payload.notice_OtherElectronicDetails}`;
    case 'OTHER':
      return `cyflwynwyd yr hysbysiad drwy ddulliau eraill: ${payload.notice_OtherExplanation}`;
    default:
      throw new Error(`Dull cyflwyno hysbysiad heb ei gefnogi: ${payload.notice_ServiceMethod}`);
  }
}
