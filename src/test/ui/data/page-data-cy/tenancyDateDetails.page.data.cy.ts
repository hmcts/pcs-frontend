import { submitCaseApiData } from '../api-data';
import { submitCaseApiDataWales } from '../api-data/submitCaseWales.api.data';

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
  cymraegLink: `Cymraeg`,
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

export function convertDateFormatTenancyDate(dateString: string): string {
  const cleanedDate = dateString.replace(/(\d+)(st|nd|rd|th)/, `$1`);
  const date = new Date(cleanedDate);

  const day = date.getDate();
  const month = date.toLocaleString(`en-US`, { month: `long` });
  const year = date.getFullYear();

  const suffix =
    day % 10 === 1 && day !== 11
      ? `st`
      : day % 10 === 2 && day !== 12
        ? `nd`
        : day % 10 === 3 && day !== 13
          ? `rd`
          : `th`;

  return `${day}${suffix} ${month} ${year}`;
}
