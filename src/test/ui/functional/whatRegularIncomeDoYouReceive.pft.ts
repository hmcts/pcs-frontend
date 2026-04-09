import { dashboard, feedback, incomeAndExpenses, whatRegularIncomeDoYouReceive } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function whatRegularIncomeDoYouReceiveErrorValidation(): Promise<void> {
  console.log(`****OTHER BENEFITS VALIDATION STARTED****`);
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`check box selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsNegativeErrorMessage,
  });
  console.log(`verified negative value error message for other benefits`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsBillionErrorMessage,
  });
  console.log(`verified > £1 billion value error message for other benefits`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered the correct value`);

  console.log(`****OTHER BENEFITS VALIDATIONS COMPLETED****`);

  console.log(`****UNIVERSAL CREDIT VALIDATION STARTED****`);
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`check box selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditNegativeErrorMessage,
  });
  console.log(`verified negative value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditBillionErrorMessage,
  });
  console.log(`verified > £1 billion value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.universalCreditTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered the correct value`);

  console.log(`****UNIVERSAL CREDIT VALIDATIONS COMPLETED****`);

  console.log(`****PENSION STATE AND PRIVATE VALIDATION STARTED****`);
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`check box selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.pensionStateAndPrivateNegativeErrorMessage,
  });
  console.log(`verified negative value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.pensionStateAndPrivateBillionErrorMessage,
  });
  console.log(`verified > £1 billion value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.pensionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered the correct value`);

  console.log(`****PENSION STATE AND PRIVATE VALIDATIONS COMPLETED****`);

  console.log(`****INCOME FROM ALL JOBS VALIDATION STARTED****`);
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`check box selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsAmountErrorMessage,
  });
  console.log(`err msg - mandatory amt field`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsFrequencyErrorMessage,
  });
  console.log(`err msg - mandatory frequency not selected`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered incorrect format for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });
  console.log(`verified incorrect format error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered negative value for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsNegativeErrorMessage,
  });
  console.log(`verified negative value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered > £1 billion for amount`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsBillionErrorMessage,
  });
  console.log(`verified > £1 billion value error message`);

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.incomeFromJobsTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered the correct value`);

  console.log(`****INCOME FROM ALL JOBS VALIDATIONS COMPLETED****`);

  // const checkboxes = page.locator('.govuk-checkboxes__input[type="checkbox"]');
  //
  // const count = await checkboxes.count();
  //
  // for (let i = 0; i < count; i++) {
  //   const checkbox = checkboxes.nth(i);
  //   if (await checkbox.isChecked()) {
  //     await checkbox.uncheck();
  //   }
  // }

    //Select Money from somewhere else
    //
    // Mandatory text box is displayed.
    // 500 Character limit
    // Error message - Enter details about the money you receive from somewhere else and how much you usually receive
    // Character count displaying remaining characters

    //emoji for text fields
}

export async function whatRegularIncomeDoYouReceiveNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whatRegularIncomeDoYouReceive.pageSlug,
  });
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.backLink, incomeAndExpenses.mainHeader);
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.saveForLaterButton, dashboard.mainHeader);
}
