import { dashboard, feedback, priorityDebtDetails, priorityDebts } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function priorityDebtDetailsErrorValidation(): Promise<void> {
  // All mandatory fields
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message1: priorityDebtDetails.enterTheTotalAmountErrorMessage,
    message2: priorityDebtDetails.enterTheAmountYouPayErrorMessage,
    message3: priorityDebtDetails.selectHowFrequentlyErrorMessage,
  });

  //Total Amount missing
  await performAction('inputText', priorityDebtDetails.whatIsTheTotalAmountQuestion, ' ');
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterTheTotalAmountErrorMessage,
  });

  // Amount you pay missing
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction('inputText', priorityDebtDetails.howMuchDoYouPayQuestion, ' ');
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterTheAmountYouPayErrorMessage,
  });

  // Radio option not selected
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.selectHowFrequentlyErrorMessage,
  });

  //Total amount exceeding max allowed value
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.billionTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.totalAmountYouOweMustBeLessThanBillionErrorMessage,
  });

  //Total amount negative value entered
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.negativeTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.totalAmountNegativeValueErrorMessage,
  });

  //Total Amount incorrect format
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.incorrectFormatTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterAmountInTheCorrectFormatErrorMessage,
  });

  //Amount you pay exceeding max allowed value
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction('inputText', priorityDebtDetails.howMuchDoYouPayQuestion, priorityDebtDetails.billionTextInput);
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.amountYouPayMustBeLessThanBillionErrorMessage,
  });

  //Amount you pay negative value entered
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction('inputText', priorityDebtDetails.howMuchDoYouPayQuestion, priorityDebtDetails.negativeTextInput);
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.amountYouPayNegativeValueErrorMessage,
  });

  //Amount you pay incorrect format
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterAmountInTheCorrectFormatErrorMessage,
  });

  //Total Amount and Radio option both missing
  await performAction('inputText', priorityDebtDetails.whatIsTheTotalAmountQuestion, ' ');
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message1: priorityDebtDetails.enterTheTotalAmountErrorMessage,
    message2: priorityDebtDetails.selectHowFrequentlyErrorMessage,
  });

  //Total Amount missing and Amount you pay incorrect format
  await performAction('inputText', priorityDebtDetails.whatIsTheTotalAmountQuestion, ' ');
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message1: priorityDebtDetails.enterTheTotalAmountErrorMessage,
    message2: priorityDebtDetails.enterAmountInTheCorrectFormatErrorMessage,
  });
}

export async function priorityDebtDetailsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', priorityDebtDetails.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: priorityDebtDetails.pageSlug,
  });
  await performValidation('pageNavigation', priorityDebtDetails.backLink, priorityDebts.mainHeader);
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoYouPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.monthRadioOption);
  await performValidation('pageNavigation', priorityDebtDetails.saveForLaterButton, dashboard.mainHeader);
}
