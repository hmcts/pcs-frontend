export const repaymentsMade = {
  mainHeader: `Previous payments`,
  hasTheDefendantPaidQuestion: (claimantName: string): string => {
    return `Has the defendant paid any money to ${claimantName} since 20th May 2025?`;
  },
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  giveDetailsHiddenTextLabel: `Give details about how much the defendant paid and when`,
  detailsTextInput: `Paid £1000 last year`,
  saveAndContinueButton: `Save and continue`,
  detailsCharLimitInputText: `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz1234567`,
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  youHave500CharactersHiddenHintText: `You have 500 characters remaining`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  getSelectIfYouPaidAnyMoneyErrorMessage: (claimantName: string): string =>
    `Select if the defendant paid any money to ${claimantName} since 20th May 2025?`,
  giveDetailsAboutHowMuchYouPaidErrorMessage: `Give details about how much the defendant paid and when`,
  mustBeUnderCharacterLimitErrorMessage: `Payment details must be 500 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiErrorMessage: `Give details about how much the defendant paid and when must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  saveForLaterButton: `Save for later`,
  backLink: `Back`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `repayments-made`,
};
