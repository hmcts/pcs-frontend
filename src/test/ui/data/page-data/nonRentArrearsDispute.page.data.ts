import { generateRandomString } from '../../utils/common/string.utils';

export const nonRentArrearsDispute = {
  mainHeader: `Disputing other parts of the claim`,
  partOfClaimParagraph: `You should`,
  // Need to fix this as part of HDPI-5786
  //toSeeIfParagraph: `to see if there’s any other parts of the claim that are incorrect or you disagree with.`,
  viewTheClaimLink: `view the claim (opens in new tab)`,
  titleGovServiceHiddenNewTab: `GOV.UK - The best place to find government services and information`,
  thisIncludesParagraph: `This includes:`,
  groundsForPossessionList: `${process.env.CLAIMANT_NAME}’s grounds for possession (their reasons for making the claim)`,
  // Need to fix this as part of HDPI-5786
  //anyDocumentsList: `any documents they’ve uploaded to support their claim`,
  //anyOtherList: `any other information they’ve given as part of their claim`,
  doYouWantToDisputeQuestion: `Do you want to dispute any other parts of the claim?`,
  explainPartOfClaimHiddenTextLabel: `Explain which parts of the claim you do not agree with`,
  explainClaimTextInput: `Example - Do not agree with claim 1`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  saveForLaterButton: `Save for later`,
  saveAndContinueButton: `Save and continue`,
  backLink: `Back`,
  detailsCharLimitInputText: generateRandomString(6501),
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  youHave6500CharactersHiddenHintText: `You have 6,500 characters remaining`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  selectIfYouWantToDisputeErrorMessage: `Select if you want to dispute any other parts of the claim`,
  partsOfClaimDoNotAgreeErrorMessage: `Enter the parts of the claim you do not agree with`,
};
