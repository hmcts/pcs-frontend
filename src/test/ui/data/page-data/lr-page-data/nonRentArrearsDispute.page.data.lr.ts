import { generateRandomString } from '../../../utils/common/string.utils';

export const nonRentArrearsDispute = {
  mainHeader: `${process.env.CLAIMANT_NAME}’s claim`,
  groundsForPossessionList: `${process.env.CLAIMANT_NAME}’s grounds for possession (their reasons for making the claim)`,
  doYouWantToDisputeQuestion: `Does the defendant dispute any other parts of the claim?`,
  explainPartOfClaimHiddenTextLabel: `Explain which parts of the claim the defendant disputes`,
  explainClaimTextInput: `Example - Do not agree with claim 1`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  saveForLaterButton: `Save for later`,
  saveAndContinueButton: `Save and continue`,
  backLink: `Back`,
  emojiTextInput: `👉 😄`,
  emojiExplainPartsOfClaimErrorMessage: `Explain which parts of the claim the defendant disputes must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  detailsCharLimitInputText: generateRandomString(6501),
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  youHave6500CharactersHiddenHintText: `You have 6,500 characters remaining`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  selectIfYouWantToDisputeErrorMessage: `Select if the defendant wants to dispute any other parts of the claim`,
  partsOfClaimDoNotAgreeErrorMessage: `Enter the parts of the claim the defendant does not agree with`,
  charLimitErrorMessage: `Explanation must be 6500 characters or less`,
};
