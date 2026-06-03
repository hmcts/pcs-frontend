import { feedback, incomeAndExpenses, taskList, whatRegularIncomeDoYouReceive } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

export async function whatRegularIncomeDoYouReceiveErrorValidation(): Promise<void> {
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsFrequencyErrorMessage,
  });

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

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsNegativeErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.otherBenefitsBillionErrorMessage,
  });

  //uncheck

  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.otherBenefitsAndCreditsParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditFrequencyErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditNegativeErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.universalCreditParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.universalCreditBillionErrorMessage,
  });

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.universalCreditParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.stateOrPrivatePensionFrequencyErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.pensionStateAndPrivateNegativeErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.pensionStateAndPrivateBillionErrorMessage,
  });

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.pensionStateAndPrivateParagraph,
  });

  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsAmountErrorMessage,
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsFrequencyErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.incorrectFormatTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incorrectFormatErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.negativeTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsNegativeErrorMessage,
  });

  await performAction('selectWhatRegularIncomeDoYouReceive', {
    regularIncomeOptions: [
      [
        whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
        whatRegularIncomeDoYouReceive.billionTextInput,
        whatRegularIncomeDoYouReceive.weekHiddenRadioOption,
      ],
    ],
  });

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.incomeFromAllJobsBillionErrorMessage,
  });

  //uncheck

  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });

  //Select Money from somewhere else
  await performAction('check', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph,
  });
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);

  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.enterDetailsAboutMoneyFromSomewhereElseErrorMessage,
  });
  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    whatRegularIncomeDoYouReceive.emojiTextInput
  );
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.emojiErrorMessage,
  });
  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    whatRegularIncomeDoYouReceive.tooManyCharTextInput
  );
  await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: whatRegularIncomeDoYouReceive.errorValidationHeader,
    message: whatRegularIncomeDoYouReceive.tooManyCharErrorMessage,
  });
  await performValidation('text', {
    elementType: 'hintText',
    text: whatRegularIncomeDoYouReceive.oneCharTooManyHiddenHintText,
  });

  await performAction(
    'inputText',
    whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
    generateRandomString(500)
  );
  await performValidation('text', { elementType: 'hintText', text: whatRegularIncomeDoYouReceive.limitHiddenHintText });

  //uncheck
  await performAction('uncheck', {
    question: whatRegularIncomeDoYouReceive.mainHeader,
    option: whatRegularIncomeDoYouReceive.incomeFromAllJobsParagraph,
  });
}

export async function whatRegularIncomeDoYouReceiveNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whatRegularIncomeDoYouReceive.pageSlug,
  });
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.backLink, incomeAndExpenses.mainHeader);
  await performValidation('pageNavigation', whatRegularIncomeDoYouReceive.saveForLaterButton, taskList.mainHeader);
}
