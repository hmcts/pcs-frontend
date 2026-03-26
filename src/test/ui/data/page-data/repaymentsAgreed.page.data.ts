export const repaymentsAgreed = {
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  getMainHeader: (claimantsName: string) =>
    `Have you come to any agreement with ${claimantsName} to repay the arrears since 20th May 2025?`,
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  detailsTextInput: 'Agreed £1000 last year',
  amNotSureRadioOption: 'I’m not sure',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
  giveDetailsHiddenHintText:
    'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
  youCanEnterUpToHiddenHintText: 'You can enter up to 500 characters',
  tooManyCharacterHiddenHintText: 'You have 1 character too many',
  backLink: 'Back',
  thereIsAProblemErrorMessageHeader: 'There is a problem',
  getSelectAgreementErrorMessage: (claimantsName: string) =>
    `Select if you’ve come to any agreement with ${claimantsName} to repay the arrears since 20th May 2025`,
  mustBe500CharactersOrFewerErrorMessage: `Must be 500 characters or fewer`,
};
