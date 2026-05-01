import { whatOtherRegularExpensesDoYouHave } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function whatOtherRegularExpensesDoYouHaveErrorValidation(): Promise<void> {
  console.log(`****HOUSEHOLD BILLS VALIDATION STARTED****`);

  // 1. Check the checkbox
  await performAction('check', {
    question: whatOtherRegularExpensesDoYouHave.mainHeader,
    option: whatOtherRegularExpensesDoYouHave.householdBillsParagraph,
  });
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`checkbox selected - clicked Save and continue`);

  // 2. Validate missing amount error
  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.householdBillsAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  // 3. Validate missing frequency error
  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.householdBillsFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  // 4. Enter incorrect format
  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.householdBillsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', whatOtherRegularExpensesDoYouHave.householdBillsWeekHiddenRadioOption);
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.invalidFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  // 5. Enter negative value
  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.householdBillsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.negativeTextInput
  );
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.householdBillsMinErrorMessage,
  });
  console.log(`verified negative value error message for household bills`);

  // 6. Enter > £1 billion
  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.householdBillsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.billionTextInput
  );
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.householdBillsMaxErrorMessage,
  });
  console.log(`verified > £1 billion value error message for household bills`);

  // 7. Uncheck
  await performAction('uncheck', {
    question: whatOtherRegularExpensesDoYouHave.mainHeader,
    option: whatOtherRegularExpensesDoYouHave.householdBillsParagraph,
  });
  console.log(`unchecked the option`);

  console.log(`****HOUSEHOLD BILLS VALIDATIONS COMPLETED****`);

  console.log(`****LOAN PAYMENTS VALIDATION STARTED****`);

  await performAction('check', {
    question: whatOtherRegularExpensesDoYouHave.mainHeader,
    option: whatOtherRegularExpensesDoYouHave.loanPaymentsParagraph,
  });
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`checkbox selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.loanPaymentsAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.loanPaymentsFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.loanPaymentsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', whatOtherRegularExpensesDoYouHave.loanPaymentsWeekHiddenRadioOption);
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.invalidFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.loanPaymentsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.negativeTextInput
  );
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.loanPaymentsMinErrorMessage,
  });
  console.log(`verified negative value error message for loan payments`);

  await performAction(
    'inputText',
    whatOtherRegularExpensesDoYouHave.loanPaymentsAmountPaidHiddenLabel,
    whatOtherRegularExpensesDoYouHave.billionTextInput
  );
  await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatOtherRegularExpensesDoYouHave.errorValidationHeader,
    message: whatOtherRegularExpensesDoYouHave.loanPaymentsMaxErrorMessage,
  });
  console.log(`verified > £1 billion value error message for loan payments`);

  await performAction('uncheck', {
    question: whatOtherRegularExpensesDoYouHave.mainHeader,
    option: whatOtherRegularExpensesDoYouHave.loanPaymentsParagraph,
  });
  console.log(`unchecked the option`);

  console.log(`****LOAN PAYMENTS VALIDATIONS COMPLETED****`);
}
