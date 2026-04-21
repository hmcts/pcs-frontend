import { submitCaseApiData } from '../api-data';
import { submitCaseApiDataWales } from '../api-data/submitCaseWales.api.data';

export const tenancyDateDetails = {
  mainHeader: `Tenancy, occupation contract or licence start date`,
  respondToAPropertyPossessionParagraph: `Respond to a property possession claim`,
  getDetailsGivenByParagraph: (claimantName: string): string => {
    return `Details given by ${claimantName}:`;
  },
  yourTenancyOccupationContractOrLicenceDateList: `Your tenancy, occupation contract or licence began on ${
    process.env.WALES_POSTCODE === 'YES'
      ? convertDateFormatTenancyDate(submitCaseApiDataWales.submitCasePayload.licenceStartDate)
      : convertDateFormatTenancyDate(submitCaseApiData.submitCasePayload.tenancy_TenancyLicenceDate)
  }`,
  isTheTenancyLicenceOrOccupationContractQuestion: `Is the tenancy, licence or occupation contract start date correct?`,
  backLink: `Back`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  iAmNotSureRadioOption: `I’m not sure`,
  whatIsTheCorrectStartDateHiddenQuestion: `What is the correct start date (optional)?`,
  dayHiddenTextLabel: `Day`,
  monthHiddenTextLabel: `Month`,
  yearHiddenTextLabel: `Year`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  cymraegLink: `Cymraeg`,
  errorValidationHeader: `There is a problem`,
  selectIfTheseTenancyDetailsAreCorrectErrorMessage: `Select if the tenancy, licence or occupation contract details are correct`,
  realDateErrorMessage: `Tenancy start date must be a real date`,
  dayMissingErrorMessage: `Your tenancy start date must include a day`,
  monthMissingErrorMessage: `Your tenancy start date must include a month`,
  yearMissingErrorMessage: `Your tenancy start date must include a year`,
  futureDateErrorMessage: `Tenancy start date must be in the past`,
  feedbackLink: `feedback (opens in new tab)`,
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
