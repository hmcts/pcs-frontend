export const chooseAnApplication = {
  mainHeader: `Choose your application`,
  whatDoYouWantToApplyForQuestion: `What do you want to apply for?`,
  adjournTheHearingRadioOption: `Ask to adjourn the hearing (move it to a later time or date)`,
  youCanApplyToChangeHintText: `You can apply to change the court hearing until a later time or date`,
  setAsideRadioOption: `Ask the court to set aside (cancel) a decision the court has made`,
  youCanAskTheCourtToSetAsideHintText: `You can ask the court to set aside its order if you have good reason. For example, if you were unable to attend the court hearing because you were ill`,
  somethingElseRadioOption: `Something else`,
  makeAnApplicationForSomethingHintText: `Make an application for something that is not listed above`,
  continueButton: `Continue`,
  cancelLink: `Cancel`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `choose-an-application`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  // if the below format is deemed complicated it will replaced as part of https://tools.hmcts.net/jira/browse/HDPI-5815
  errorValidationType: { one: `radioOptions`, two: `textField`, three: `checkBox` },
  errorValidationField: {
    errorRadioOption: { type: `none`, input: ``, errMessage: `Please select an application` },
  },
};
