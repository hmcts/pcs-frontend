export const tenancyDateUnknown = {
  mainHeader: 'Tenancy, occupation contract or licence start date',
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  whenDidYourTenancyQuestion: 'ERRWhen did your tenancy, occupation contract or licence start (optional)?',
  getDidNotProvideParagraph: (claimantName: string): string => {
    return `${claimantName} did not provide the start date of your tenancy, occupation contract or licence.`;
  },
  forExampleHintText: 'For example, 27 9 2022',
  dayTextLabel: 'Day',
  monthTextLabel: 'Month',
  yearTextLabel: 'Year',
  saveForLaterButton: 'Save for later',
  saveAndContinueButton: 'Save and continue',
  thereIsAProblemErrorMessageHeader: 'There is a problem',
  dayMissingErrorMessage: 'Your tenancy start date must include a day',
  monthMissingErrorMessage: 'Your tenancy start date must include a month',
  yearMissingErrorMessage: 'ERRYour tenancy start date must include a year',
  realDateErrorMessage: 'Tenancy start date must be a real date',
  backLink: 'ERRBack',
};
