import { dashboard, feedback, incomeAndExpenses, whatRegularIncomeDoYouReceive } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function whatRegularIncomeDoYouReceiveErrorValidation(): Promise<void> {
  //select all the check-boxes and verify the error message for mandatory amount and frequency -
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
  });

  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`checked all the check boxed and clicked Save and continue`);

  //income from all jobs error validation
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsFrequencyErrorMessage,
  });

  //state or private pension error validation
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionFrequencyErrorMessage,
  });

  //Universal Credit error validation
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditFrequencyErrorMessage,
  });

  //other benefits error validation
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsFrequencyErrorMessage,
  });

  console.log('verified mandatory amount and frequency error messages');

  //enter incorrect format for each field

  //entered incorrect format for other benefits and validated the error.
  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });
  console.log(`verified incorrect format error message for other benefits`);
  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.otherBenefitsTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });
  console.log(`entered correct format for other benefits`);

  // await performAction('selectWhatRegularIncomeDoYouReceive', {
  //   regularIncomeOptions: [
  //     [
  //       whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  //       whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //       whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //     ],
  //     [
  //       whatRegularIncomeDoYouReceive.universalCreditParagraph,
  //       whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //       whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
  //     ],
  //     [
  //       whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  //       whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
  //       whatRegularIncomeDoYouReceive.monthHiddenRadioOption,
  //     ],
  //     [
  //       whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  //       whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  //       whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
  //     ],
  //   ],
  // });
  //
  // //state or private pension error validation
  // await performValidation('errorMessage', {
  //   header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //   message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionAmountErrorMessage,
  // });
  //
  //
  // //Universal Credit error validation
  //
  // await performValidation('errorMessage', {
  //   header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //   message: whatRegularIncomeDoYouReceive.universalCreditFrequencyErrorMessage,
  // });
  //
  // //other benefits error validation
  // await performValidation('errorMessage', {
  //   header: whatRegularIncomeDoYouReceive.errorValidationHeader,
  //   message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsAmountErrorMessage,
  // });

  // enter negative value for each field

  //enter >£1 billion for each field

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
