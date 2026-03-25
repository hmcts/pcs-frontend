export const confirmationOfNoticeGiven = {
  mainHeader: `Notice details`,
  respondToAPropertyPossessionParagraph: `Respond to a property possession claim`,
  noticeIsAFormalHintText: `A notice is a formal document from your landlord or mortgage provider saying they plan to take legal action to repossess the property, which must follow certain legal requirements`,
  backLink: `Back`,
  getDidClaimantGiveYouQuestion(claimantName: string): string {
    return `Did ${claimantName} give you notice of their intention to begin possession proceedings?`;
  },
  imNotSureRadioOption: `I’m not sure`,
  noRadioOption: `No`,
  orHintText: `or`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  signOutLink: `Sign out`,
  yesRadioOption: `Yes`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  selectIfNoticeOfIntentionGivenErrorMessage(claimantName: string): string {
    return `Select if ${claimantName} gave you notice of their intention to begin possession proceedings`;
  },
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `confirmation-of-notice-given`,
};
