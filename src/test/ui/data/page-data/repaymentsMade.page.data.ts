export const repaymentsMade = {
  getmainHeader: (claimantName: string): string => {
    return `Have you paid any money to ${claimantName} since 16th June 2025?`;
  },
  respondToClaimParagraph: `Respond to a property possession claim`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  giveDetailsHiddenTextLabel: `Give details about how much you paid and when`,
  detailsTextInput: `Paid £1000 last year`,
  saveAndContinueButton: `Save and continue`,
  detailsCharLimitInputText: `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz1234567`,
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  youHave500CharactersHiddenHintText: `You have 500 characters remaining`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  getSelectIfYouPaidAnyMoneyErrorMessage: (claimantName: string): string =>
    `Select if you’ve paid any money to ${claimantName} since 16th June 2025`,
  giveDetailsAboutHowMuchYouPaidErrorMessage: `Give details about how much you paid and when`,
  mustBeUnderCharacterLimitErrorMessage: `Must be 500 characters or fewer`,
  saveForLaterButton: `Save for later`,
  backLink: `Back`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `repayments-made`,
};
