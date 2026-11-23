// import { submitCaseApiData } from '../api-data';

export const noticeDateWhenNotProvided = {
  mainHeader: `Dyddiad yr hysbysiad`,
  backLink: `Yn ôl`,
  didNotProvideNoticeLabel: () =>
    `${process.env.CLAIMANT_NAME} ni ddarparodd y dyddiad y cyflwynwyd yr hysbysiad i chi.`,
  getWhenDidYouReceiveNoticeQuestion: () => `Pryd gawsoch yr hysbysiad gan ${process.env.CLAIMANT_NAME} (dewisol)?`,
  exampleHintText: `Er enghraifft, 27 9 2022. Os nad ydych yn siŵr o’r union ddyddiad, gallwch ddod o hyd iddo ar yr hysbysiad`,
  dayTextLabel: `Diwrnod`,
  monthTextLabel: `Mis`,
  yearTextLabel: `Blwyddyn`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  signOutLink: `Allgofnodi`,
  thereIsAProblemErrorMessageHeader: `Mae problem`,
  theDateYouReceiveNoticeErrorMessage: `Rhaid i'r dyddiad y cawsoch yr hysbysiad fod naill ai heddiw neu yn y gorffennol`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `confirmation-of-notice-date-when-not-provided`,
};
