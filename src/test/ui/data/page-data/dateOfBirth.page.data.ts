export const dateOfBirth = {
  mainHeader: "What's your date of birth?",
  respondToClaimParagraph: 'Respond to a property possession claim',
  forExampleParagraph: 'For example, 27 9 2022',
  dayTextLabel: 'Day',
  monthTextLabel: 'Month',
  yearTextLabel: 'Year',
  dayInputText: getRandomInt(1, 31).toString(),
  monthInputText: getRandomInt(1, 12).toString(),
  yearInputText: getRandomInt(1950, 2005).toString(),
  saveAndContinueButton: 'Save and continue',
  saveForLater: 'Save for later',
  errorValidation: 'YES',
  errorValidationType: { input: 'textField', radio: 'radioOptions', checkbox: 'checkBox', date: 'dateField' },
  errorValidationHeader: 'There is a problem',
  errorValidationField: {
    errorTextField: [{ type: 'empty', label: '', errMessage: 'Enter your date of birth' }],
  },
};
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
