export const dateOfBirth = {
  mainHeader: 'What\'s your date of birth?',
  respondToClaimParagraph: 'Respond to a property possession claim',
  forExampleParagraph: 'For example, 27 9 2022',
  dayTextLabel: 'Day',
  monthTextLabel: 'Month',
  yearTextLabel: 'Year',
  dayInputText: '27',
  monthInputText: '9',
  yearInputText: '1985',
  saveAndContinueButton: 'Save and continue',
  saveForLater: 'Save for later',
  errorValidation: 'YES',
  errorValidationType: { input: 'textField', radio: 'radioOptions', checkbox: 'checkBox', date: 'dateField' },
  errorValidationHeader: 'There is a problem',
  errorValidationField: {
    errorTextField: [
      { type: 'empty', label: 'First name', errMessage: 'Enter your first name' },
      { type: 'empty', label: 'Last name', errMessage: 'Enter your last name' },
    ],
  },

  /*dateValidationAllBlank: {
    validationReq: 'YES',
    validationType: 'dateField',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    fieldName: 'date of birth',
    header: 'There is a problem',
  },
  // Example 2: Day missing
  dateValidationDayMissing: {
    validationReq: 'YES',
    validationType: 'dateField',
    dobDay: '',
    dobMonth: '9',
    dobYear: '1985',
    fieldName: 'date of birth',
    header: 'There is a problem',
  },
  // Example 3: Month missing
  dateValidationMonthMissing: {
    validationReq: 'YES',
    validationType: 'dateField',
    dobDay: '27',
    dobMonth: '',
    dobYear: '1985',
    fieldName: 'date of birth',
    header: 'There is a problem',
  },
  // Example 4: Year missing
  dateValidationYearMissing: {
    validationReq: 'YES',
    validationType: 'dateField',
    dobDay: '27',
    dobMonth: '9',
    dobYear: '',
    fieldName: 'date of birth',
    header: 'There is a problem',
  },*/
};

