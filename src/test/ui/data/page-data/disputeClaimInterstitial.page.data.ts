export const disputeClaimInterstitial = {
  getMainHeader: (claimantName: string): string => {
    const nameClaimant =
      claimantName.substring(claimantName.length - 1) === 's' ? `${claimantName}'` : `${claimantName}’s`;
    return nameClaimant + ' claim';
  },
  whenTheyMadeTheirClaimParagraph: `When they made their claim, they had to give information about:`,
  theTenancyList: `the tenancy, occupation contract or licence agreement`,
  theNoticeOfTheirIntentionList: `the notice of their intention to begin possession proceedings, if they served you with one`,
  theirGroundsForPossessionList: `their grounds for possession (their reasons for making the claim)`,
  ifAnyOfTheInformationParagraph: `If any of the information is wrong, or you disagree with it, you can dispute their claim or parts of it.`,
  theClaimantParagraph: `The claimant will be able to see your answers.`,
  continueButton: `Continue`,
  cancelLink: `Cancel`,
  cymraegLink: `Cymraeg`,
  backLink: `Back`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `dispute-claim-interstitial`,
};
