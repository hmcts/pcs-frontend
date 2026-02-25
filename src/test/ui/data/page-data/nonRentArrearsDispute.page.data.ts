function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

export const nonRentArrearsDispute = {
  mainHeader: 'Disputing other parts of the claim',
  partOfClaimParagraph:
    'You should view the claim (opens in new tab) to see if there’s any other parts of the claim that are incorrect or you disagree with.',
  viewTheClaimLink: 'view the claim (opens in new tab)',
  mainHeaderGovServiceHiddenNewTab: 'Welcome to GOV.UK',
  thisIncludesParagraph: 'This includes:',
  groundsForPossessionList: 'Treetops Housing’s grounds for possession (their reasons for making the claim)',
  anyDocumentsList: 'any documents they’ve uploaded to support their claim',
  anyOtherList: ' any other information they’ve given as part of their claim',
  doYouWantToDisputeQuestion: 'Do you want to dispute any other parts of the claim?',
  explainPartOfClaimHiddenTextLabel: 'Explain which parts of the claim you do not agree with',
  explainClaimTextInput: 'Example - Do not agree with claim 1,2 and 3',
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  saveForLaterButton: 'Save for later',
  saveAndContinueButton: 'Save and continue',
  backLink: 'Back',
  detailsCharLimitInputText: generateRandomString(6501),
  tooManyCharacterHiddenHintText: 'You have 1 character too many',
  youHave6500CharactersHiddenHintText: 'You have 6,500 characters remaining',
  thereIsAProblemErrorMessageHeader: 'There is a problem',
  selectIfYouWantToDisputeErrorMessage: 'Select if you want to dispute any other parts of the claim',
  partsOfClaimDoNotAgreeErrorMessage: 'Enter the parts of the claim you do not agree with',
};
