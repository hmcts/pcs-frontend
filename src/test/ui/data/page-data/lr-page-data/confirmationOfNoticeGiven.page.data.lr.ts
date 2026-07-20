export const confirmationOfNoticeGiven = {
  mainHeader: `Notice details`,
  backLink: `Back`,
  getDidClaimantGiveYouQuestion(claimantName: string): string {
    return `Did ${claimantName} give the defendant notice of their intention to begin possession proceedings?`;
  },
  defendantNotSureRadioOption: `Defendant is not sure`,
  noRadioOption: `No`,
  orHintText: `or`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  yesRadioOption: `Yes`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  selectIfNoticeOfIntentionGivenErrorMessage(claimantName: string): string {
    return `Select if ${claimantName} gave the defendant notice of their intention to begin possession proceedings`;
  },
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `confirmation-of-notice-given`,
};
