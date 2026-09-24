import { priorityDebtDetails } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function priorityDebtDetailsErrorValidation(): Promise<void> {
  // All mandatory fields
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message1: priorityDebtDetails.enterTheTotalAmountErrorMessage,
    message2: priorityDebtDetails.enterTheAmountDefendantPaysErrorMessage,
    message3: priorityDebtDetails.selectHowFrequentlyErrorMessage,
  });

  // Radio option not selected
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.selectHowFrequentlyErrorMessage,
  });

  //Total Amount missing
  await performAction('inputText', priorityDebtDetails.whatIsTheTotalAmountQuestion, ' ');
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
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
  await performAction('inputText', priorityDebtDetails.howMuchDoesDefendantPayQuestion, ' ');
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterTheAmountDefendantPaysErrorMessage,
  });

  //Total amount exceeding max allowed value
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.billionTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.totalAmountMustBeLessThanBillionErrorMessage,
  });

  //Total amount negative value entered
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.negativeTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
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
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.amountYouPayTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterTotalAmountInTheCorrectFormatErrorMessage,
  });

  //Amount you pay exceeding max allowed value
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.billionTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.amountDefendantPaysMustBeLessThanBillionErrorMessage,
  });

  //Amount you pay negative value entered
  await performAction(
    'inputText',
    priorityDebtDetails.whatIsTheTotalAmountQuestion,
    priorityDebtDetails.totalAmountTextInput
  );
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.negativeTextInput
  );
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
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message: priorityDebtDetails.enterAmountYouPayInTheCorrectFormatErrorMessage,
  });

  //Total Amount and Radio option both missing
  await performAction('inputText', priorityDebtDetails.whatIsTheTotalAmountQuestion, ' ');
  await performAction(
    'inputText',
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
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
    priorityDebtDetails.howMuchDoesDefendantPayQuestion,
    priorityDebtDetails.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', priorityDebtDetails.weekRadioOption);
  await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: priorityDebtDetails.thereIsAProblemErrorMessageHeader,
    message1: priorityDebtDetails.enterTheTotalAmountErrorMessage,
    message2: priorityDebtDetails.enterAmountYouPayInTheCorrectFormatErrorMessage,
  });
}
