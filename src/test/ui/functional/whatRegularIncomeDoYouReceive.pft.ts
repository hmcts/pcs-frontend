import { dashboard, feedback, incomeAndExpenses, whatRegularIncomeDoYouReceive } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function whatRegularIncomeDoYouReceiveErrorValidation(): Promise<void> {
  //select all the check-boxes and verify the error message for mandatory amount and frequency -

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
  console.log(`verified incorrect format error message for other benefits`);

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
  console.log(`entered the correct value for other benefits`);

  console.log(`****OTHER BENEFITS VALIDATIONS COMPLETED****`);

  //   await performAction('check', {
  //     question: whatRegularIncomeDoYouReceive.mainHeader,
  //     option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //   });
  //
  //   await performAction('check', {
  //     question: whatRegularIncomeDoYouReceive.mainHeader,
  //     option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //   });
  //
  //   await performAction('check', {
  //     question: whatRegularIncomeDoYouReceive.mainHeader,
  //     option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //   });
  //
  //
  //   await performAction('check', {
  //     question: whatRegularIncomeDoYouReceive.mainHeader,
  //     option: whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
  //   });
  //
  //   await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  //   console.log(`checked all the check boxed and clicked Save and continue`);
  //
  //   //income from all jobs error validation
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incomeFromAllJobsAmountErrorMessage,
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incomeFromAllJobsFrequencyErrorMessage,
  //   });
  //
  //   //state or private pension error validation
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionAmountErrorMessage,
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionFrequencyErrorMessage,
  //   });
  //
  //   //Universal Credit error validation
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.universalCreditAmountErrorMessage,
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.universalCreditFrequencyErrorMessage,
  //   });
  //
  //
  //   console.log('verified mandatory amount and frequency error messages');
  //
  //   //enter incorrect format for each field
  //
  //   //entered incorrect format for other benefits and validated the error.
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  //         whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //   });
  //   console.log(`verified incorrect format error message for other benefits`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  //         whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered the correct value for other benefits`);
  //
  //
  //   //universal credit
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //         whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //   });
  //   console.log(`entered correct format for universal credit`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //         whatRegularIncomeDoYouReceive.universalCreditTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered the correct value for universal credit`);
  //
  //
  //   //pension state and private
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //         whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //   });
  //   console.log(`verified error message for incorrect format for pension state and private`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //         whatRegularIncomeDoYouReceive.pensionTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered correct format for pension state and private`);
  //
  //
  // //income from all jobs
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //         whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //   });
  //   console.log(`verified error message for income from all jobs`);
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //         whatRegularIncomeDoYouReceive.totalAmountReceivedIncomeFromJobsTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered correct format for income from all jobs`);
  //
  //
  //   // enter negative value for each field
  //
  //   // other benefits and validated the error.
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  //         whatRegularIncomeDoYouReceive.negativeTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.otherBenefitsNegativeErrorMessage,
  //   });
  //   console.log(`verified negative value error message for other benefits`);
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  //         whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered correct format for other benefits`);
  //
  //
  //   //universal credit
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //         whatRegularIncomeDoYouReceive.negativeTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.universalCreditNegativeErrorMessage,
  //   });
  //   console.log(`error message - negative - universal credit`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //         whatRegularIncomeDoYouReceive.universalCreditTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   console.log(`entered correct format for universal credit`);
  //
  //
  //   //pension state and private
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //         whatRegularIncomeDoYouReceive.negativeTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.pensionStateAndPrivateNegativeErrorMessage,
  //   });
  //   console.log(`err msg - negative - pension state and private`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //         whatRegularIncomeDoYouReceive.pensionTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered correct format for pension state and private`);
  //
  // //income from all jobs
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //         whatRegularIncomeDoYouReceive.negativeTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //
  //   await performValidation('errorMessage', {
  //     header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //     message: whatRegularIncomeDoYouReceive.incomeFromAllJobsNegativeErrorMessage,
  //   });
  //   console.log(`err msg - negative - income from all jobs`);
  //
  //   await performAction('selectWhatRegularIncomeDoYouReceive', {
  //     regularIncomeOptions: [
  //       [
  //         whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //         whatRegularIncomeDoYouReceive.totalAmountReceivedIncomeFromJobsTextInput,
  //         whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //       ],
  //     ],
  //   });
  //   console.log(`entered correct format for income from all jobs`);
  //
  //   //enter >£1 billion for each field
  //
  //
  //   //Select Money from somewhere else
  //   //
  //   // Mandatory text box is displayed.
  //   // 500 Character limit
  //   // Error message - Enter details about the money you receive from somewhere else and how much you usually receive
  //   // Character count displaying remaining characters
  //
  //   //emoji for text fields
}

export async function whatRegularIncomeDoYouReceiveNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whatRegularIncomeDoYouReceive.pageSlug,
  });
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.backLink, incomeAndExpenses.mainHeader);
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.saveForLaterButton, dashboard.mainHeader);
}
