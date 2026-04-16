import { feedback, otherRegularExpenses, priorityDebtDetails } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function otherRegularExpensesErrorValidation(): Promise<void> {
  const expenseTypes = [
    {
      key: 'householdBills',
      amountErrorMessage: otherRegularExpenses.householdBillsAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.householdBillsFrequencyErrorMessage,
    },
    {
      key: 'loanPayments',
      amountErrorMessage: otherRegularExpenses.loanPaymentsAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.loanPaymentsFrequencyErrorMessage,
    },
    {
      key: 'childSpousalMaintenance',
      amountErrorMessage: otherRegularExpenses.childSpousalMaintenanceAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.childSpousalMaintenanceFrequencyErrorMessage,
    },
    {
      key: 'mobilePhone',
      amountErrorMessage: otherRegularExpenses.mobilePhoneAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.mobilePhoneFrequencyErrorMessage,
    },
    {
      key: 'groceryShopping',
      amountErrorMessage: otherRegularExpenses.groceryShoppingAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.groceryShoppingFrequencyErrorMessage,
    },
    {
      key: 'fuelParkingTransport',
      amountErrorMessage: otherRegularExpenses.fuelParkingTransportAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.fuelParkingTransportFrequencyErrorMessage,
    },
    {
      key: 'schoolCosts',
      amountErrorMessage: otherRegularExpenses.schoolCostsAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.schoolCostsFrequencyErrorMessage,
    },
    {
      key: 'clothing',
      amountErrorMessage: otherRegularExpenses.clothingAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.clothingFrequencyErrorMessage,
    },
    {
      key: 'otherExpenses',
      amountErrorMessage: otherRegularExpenses.otherExpensesAmountErrorMessage,
      frequencyErrorMessage: otherRegularExpenses.otherExpensesFrequencyErrorMessage,
    },
  ];

  for (const expense of expenseTypes) {
    await performAction('check', {
      question: otherRegularExpenses.mainHeader,
      option: `${expense.key}Paragraph`,
    });
    await performAction('clickButton', otherRegularExpenses.saveAndContinueButton);

    await performValidation('errorMessage', {
      header: otherRegularExpenses.errorValidationHeader,
      message: expense.amountErrorMessage,
    });

    await performValidation('errorMessage', {
      header: otherRegularExpenses.errorValidationHeader,
      message: expense.frequencyErrorMessage,
    });

    await performAction('check', {
      question: otherRegularExpenses.mainHeader,
      option: `${expense.key}Paragraph`,
    });
  }
  await performAction('clickCheckbox', otherRegularExpenses.loanPaymentsParagraph);
  await performAction(
    'inputText',
    otherRegularExpenses.loanPaymentsPaidEveryLabel,
    otherRegularExpenses.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', otherRegularExpenses.loanPaymentsMonthRadioOption);
  await performAction('clickButton', otherRegularExpenses.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: otherRegularExpenses.errorValidationHeader,
    message: otherRegularExpenses.invalidFormatErrorMessage,
  });

  await performAction(
    'inputText',
    otherRegularExpenses.loanPaymentsPaidEveryLabel,
    otherRegularExpenses.negativeTextInput
  );
  await performAction('clickButton', otherRegularExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherRegularExpenses.errorValidationHeader,
    message: otherRegularExpenses.loanPaymentsMinErrorMessage,
  });
  await performAction(
    'inputText',
    otherRegularExpenses.loanPaymentsPaidEveryLabel,
    otherRegularExpenses.billionTextInput
  );
  await performAction('clickButton', otherRegularExpenses.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherRegularExpenses.errorValidationHeader,
    message: otherRegularExpenses.loanPaymentsMaxErrorMessage,
  });
}

export async function otherRegularExpensesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', otherRegularExpenses.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: otherRegularExpenses.pageSlug,
  });
  await performValidation('pageNavigation', otherRegularExpenses.backLink, priorityDebtDetails.mainHeader);
}
