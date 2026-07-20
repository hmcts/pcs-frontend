export const counterClaimLR = {
  mainHeader: `Counterclaim`,
  thereWillBeLinkParagraph: `There will be a link to make a counterclaim once you’ve submitted the response.`,
  getDoYouWantToMakeACounterclaimQuestion: (): string => {
    return `Is the defendant planning to make a counterclaim against ${process.env.CLAIMANT_NAME}?`;
  },
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  backLink: `Back`,
  saveForLaterButton: `Save for later`,
  saveAndContinueButton: `Save and continue`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `counter-claim`,
  // selectIfYouArePlanningToMakeClaimErrorMessage: `Select if you’re planning to make a counterclaim`,
  // thereIsAProblemErrorMessageHeader: `There is a problem`,
};
