export const tenancyDateUnknown = {
  mainHeader: 'Dyddiad dechrau tenantiaeth, contract meddiannaeth neu drwydded',
  whenDidYourTenancyQuestion: 'Pryd wnaeth eich tenantiaeth, contract meddiannaeth neu drwydded ddechrau (dewisol)?',
  getDidNotProvideParagraph: (claimantName: string): string => {
    return `Ni wnaeth ${claimantName} ddarparu dyddiad dechrau eich tenantiaeth, contract meddiannaeth neu drwydded.`;
  },
  forExampleHintText: 'Er enghraifft, 27 9 2022',
  dayTextLabel: 'Diwrnod',
  monthTextLabel: 'Mis',
  yearTextLabel: 'Blwyddyn',
  saveForLaterButton: 'Cadw at hwyrach ymlaen',
  saveAndContinueButton: 'Cadw a pharhau',
  thereIsAProblemErrorMessageHeader: 'Mae yna broblem',
  dayMissingErrorMessage: 'Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys day',
  monthMissingErrorMessage: 'Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys month',
  yearMissingErrorMessage: 'Rhaid i ddyddiad dechrau eich tenantiaeth gynnwys year',
  realDateErrorMessage: 'Rhaid i ddyddiad dechrau’r denantiaeth fod yn ddyddiad go iawn',
  backLink: 'Yn ôl',
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `tenancy-date-unknown`,
};
