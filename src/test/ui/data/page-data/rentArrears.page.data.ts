export const rentArrears = {
  mainHeader: 'Rent arrears',
  rentArrearsHintText: 'Rent arrears are money you owe in rent payments. \n' +
    '\n' +
    'When making their claim, Treetops Housing had to provide a copy of the rent statement for your property, showing the total rent arrears you owe.\n' +
    '\n' +
    'The rent statement will have been included in the pack you received in the post letting you know a claim had been made against you, and is also available to view from ‘View the claim’ on your case overview.',
  saveAndContinueButton: 'Save and continue',
  amountYouOweParagraph: 'Amount you owe in rent arrears given by Treetops Housing:',
  amountParagraph: '£3250.00',
  rentAmountTextInput: '1000.00',
  negativeTextInput:'-100.00',
  billionTextInput: '1000001.00',
  doYouOweThisQuestion: 'Do you owe this amount in rent arrears?',
  howMuchDoYouBelieveHiddenTextLabel: 'How much do you believe you owe in rent arrears?',
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  imNotSureRadioOption: 'I’m not sure',
  saveForLaterButton: 'Save for later',
  backLink: 'Back',
  errorValidation: 'YES',
  errorValidationType: { input: 'textField', radio: 'radioOptions' },
  errorValidationHeader: 'There is a problem',
  errorValidationField: {
    errorRadioMsg: [{ errMessage: 'Do you owe this amount in rent arrears?' }],
    errorTextField: [
      {
        type: 'empty',
        label: 'How much do you believe you owe in rent arrears?',
        errMessage: 'Enter the amount you believe you owe in rent arrears',
      },
    ],
    errorNegativeTextInput: [
      {
        type: 'empty',
        label: 'How much do you believe you owe in rent arrears?',
        errMessage: 'The amount you believe you owe in rent arrears must be £0.00 or above',
      }
    ],
    errorBillionTextInput: [
      {
        type: 'empty',
        label: 'How much do you believe you owe in rent arrears?',
        errMessage: 'The amount you believe you owe in rent arrears must be less than £1 billion',
      }
    ],
  },
};
