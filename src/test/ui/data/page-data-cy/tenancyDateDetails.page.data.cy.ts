import { submitCaseApiData } from '../api-data';
import { submitCaseApiDataWales } from '../api-data/submitCaseWales.api.data';
import { convertDateFormatTenancyDate } from '../page-data';

export const tenancyDateDetails = {
  mainHeader: `Dyddiad dechrau tenantiaeth, contract meddiannaeth neu drwydded`,
  getDetailsGivenByParagraph: () => `Manylion a roddwyd gan ${process.env.CLAIMANT_NAME}:`,
  yourTenancyOccupationContractOrLicenceDateList: `Dechreuodd eich tenantiaeth, contract meddiannaeth neu drwydded ar ${
    process.env.WALES_POSTCODE === 'YES'
      ? convertDateFormatTenancyDate(submitCaseApiDataWales.submitCasePayload.licenceStartDate)
      : convertDateFormatTenancyDate(submitCaseApiData.submitCasePayload.tenancy_TenancyLicenceDate)
  }`,
  isTheTenancyLicenceOrOccupationContractQuestion: `A yw dyddiad dechrau’r denantiaeth, drwydded neu gontract meddiannaeth yn gywir?`,
  backLink: `Yn ôl`,
  yesRadioOption: `Ydy`,
  noRadioOption: `Nac ydy`,
  iAmNotSureRadioOption: `Nid wyf yn siŵr`,
  whatIsTheCorrectStartDateHiddenQuestion: `Beth yw’r dyddiad dechrau cywir (dewisol)?`,
  dayHiddenTextLabel: `Diwrnod`,
  monthHiddenTextLabel: `Mis`,
  yearHiddenTextLabel: `Blwyddyn`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  signOutLink: `Allgofnodi`,
  cymraegLink: `English`,
  errorValidationHeader: `There is a problem`,
  selectIfTheseTenancyDetailsAreCorrectErrorMessage: `Dewiswch a yw manylion y denantiaeth, drwydded neu gontract meddiannaeth yn gywir`,
  realDateErrorMessage: `Rhaid i ddyddiad dechrau’r denantiaeth fod yn ddyddiad go iawn`,
  dayMissingErrorMessage: `Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys day`,
  monthMissingErrorMessage: `Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys month`,
  yearMissingErrorMessage: `Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys year`,
  futureDateErrorMessage: `Rhaid i ddyddiad dechrau’r denantiaeth fod yn y gorffennol`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `tenancy-date-details`,
};
