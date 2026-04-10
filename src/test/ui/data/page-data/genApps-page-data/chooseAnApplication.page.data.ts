export const chooseAnApplication = {
  mainHeader: `Choose an application`,
  whatDoYouWantToApplyForQuestion: `What do you want to apply for?`,
  delayRadioOption: `Ask to adjourn (delay) the hearing`,
  setAsideRadioOption: `Ask the court to change (set aside) their decision to evict you`,
  somethingElseRadioOption: `Something else`,
  continueButton: `Continue`,
  cancelLink: `Cancel`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  // if the below format is deemed complicated it will replaced as part of https://tools.hmcts.net/jira/browse/HDPI-5815
  errorValidationType: { one: `radioOptions`, two: `textField`, three: `checkBox` },
  errorValidationField: {
    errorRadioOption: { type: `none`, input: ``, errMessage: `You must select an type of application to apply for` },
  },
};
