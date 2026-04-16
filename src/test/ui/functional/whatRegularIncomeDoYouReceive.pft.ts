import { dashboard, feedback, incomeAndExpenses, whatRegularIncomeDoYouReceive } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
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

  //uncheck

  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  });
  console.log(`unchecked the option`);

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

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  });
  console.log(`unchecked the option`);

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

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  });
  console.log(`unchecked the option`);

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

  //uncheck

  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });
  console.log(`unchecked the option`);

  console.log(`****INCOME FROM ALL JOBS VALIDATIONS COMPLETED****`);

  //Select Money from somewhere else
  console.log(`****MONEY FROM SOMEWHERE ELSE VALIDATION STARTED****`);
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  console.log(`check box selected - clicked Save and continue`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.enterDetailsAboutMoneyFromSomewhereElseErrorMessage,
  });
  console.log(`err msg - mandatory text field`);
  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    whatRegularIncomeDoYouReceive.emojiTextInput
  );
  console.log(`entered emoji input text`);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.emojiErrorMessage,
  });
  console.log(`verified emoji error message`);
  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    whatRegularIncomeDoYouReceive.tooManyCharTextInput
  );
  console.log(`entered text 501 char length`);
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.tooManyCharErrorMessage,
  });
  console.log(`verified too many char error message`);
  await performValidation('text', {
    elementType: 'hintText',
    text: whatRegularIncomeDoYouReceive.oneCharTooManyHiddenHintText,
  });
  console.log(`verified one chr too many hidden hint text for 501 char entered`);

  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    generateRandomString(500)
  );
  console.log(`entered text 500 char length`);
  await performValidation('text', { elementType: 'hintText', text: whatRegularIncomeDoYouReceive.limitHiddenHintText });
  console.log(`verified hint text for limit hint text`);

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });
  console.log(`unchecked the option`);

  console.log(`****MONEY FROM SOMEWHERE ELSE VALIDATIONS COMPLETED****`);
}

export async function whatRegularIncomeDoYouReceiveNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whatRegularIncomeDoYouReceive.pageSlug,
  });
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.backLink, incomeAndExpenses.mainHeader);
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.saveForLaterButton, dashboard.mainHeader);
}
