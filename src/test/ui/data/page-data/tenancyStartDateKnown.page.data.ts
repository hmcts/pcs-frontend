import { submitCaseApiData } from '../api-data';
import { convertDateFormat } from './noticeDateKnown.page.data';

export const tenancyStartDateKnown = {
  mainHeader: 'Tenancy, occupation contract or licence start date',
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  getDetailsGivenByParagraph:(claimantName: string): string => {
    return `Details given by : ${claimantName} `;
  },
  yourTenancyOccupationContractOrLicenceDateParagraph: `Your tenancy, occupation contract or licence began on ${convertDateFormat(submitCaseApiData.submitCasePayload.tenancy_TenancyLicenceDate)}`,
  isTheTenancyLicenceOrOccupationContractQuestion: 'Is the tenancy, licence or occupation contract start date correct?',
  backLink: 'Back',
  exampleHintText: 'For example, 27 9 2022',
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  iAmNotSureRadioOption: 'I’m not sure',
  whatIsTheCorrectStartDateHiddenQuestion: 'What is the correct start date (optional)?',
  dayHiddenTextLabel: 'Day',
  monthHiddenTextLabel: 'Month',
  yearHiddenTextLabel: 'Year',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
  signOutLink: 'Sign out',
  cymraegLink: 'Cymraeg',
  errorValidationHeader: 'There is a problem',
  selectIfTheseTenancyDetailsAreCorrectErrorMessage:
    'Select if these tenancy, licence or occupation contract details are correct',
  tenancyStartDateMustBeRealDateErrorMessage: 'Tenancy start date must be a real date',
  tenancyStartDateWithDayMissingErrorMessage: 'Your tenancy start date must include a day',
  tenancyStartDateWithMonthMissingErrorMessage: 'Your tenancy start date must include a month',
  tenancyStartDateWithYearMissingErrorMessage: 'Your tenancy start date must include a year',
  tenancyStartDateWithFutureDateErrorMessage: 'Tenancy start date must be in the past',
};
