export const whatOrderDoYouWantTheCourtToMakeAndWhy = {
  mainHeader: `What order do you want the court to make, and why?`,
  makeAnApplicationParagraph: `Make an application`,
  forExampleParagraph: `For example, tell the court:`,
  includeDetailsOfAnyFactsParagraph: `Include details of any facts or evidence that you think the court should consider when it makes a decision. You can upload your evidence on the next page.`,
  explainWhatYouWantTextLabel: `Explain what you want the court to do, and why`,
  youHave600CharactersHiddenHintText: `You have 6,800 characters remaining`,
  whatYouWantTheCourtToDoTextInput: `Include details of any facts or evidence`,
  continueButton: `Continue`,
  cancelLink: `Cancel`,
  backLink: `Back`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `what-order-do-you-want-the-court-to-make-and-why`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  errorValidationType: { one: `radioOptions`, two: `textField`, three: `checkBox` },
  errorValidationField: {
    errorTextField: [
      { type: 'empty', input: 'EMPTY', errMessage: 'Confirm the order you want the court to make, and why' },
      { type: 'moreThanMax', input: 6900, errMessage: 'Must be 6800 characters or fewer' },
    ],
  },
};
