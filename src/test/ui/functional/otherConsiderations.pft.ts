import { incomeAndExpenses, otherConsiderations, whatOtherRegularExpensesDoYouHave } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

const charLimitInputText = generateRandomString(6401);
export async function otherConsiderationsErrorValidation(): Promise<void> {
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.selectIfThereIsAnythingElseYouWantToTellTheCourtErrorMessage,
  });

  await performAction('clickRadioButton', otherConsiderations.yesRadioOption);
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.giveDetailsAboutWhatYouWantToTellTheCourtErrorMessage,
  });

  // Char limit
  await performAction('clickRadioButton', otherConsiderations.yesRadioOption);
  await performAction('inputText', otherConsiderations.giveDetailsHiddenTextLabel, charLimitInputText);
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.mustBeUnderCharacterLimitErrorMessage,
  });

  // emojis
  await performAction('clickRadioButton', otherConsiderations.yesRadioOption);
  await performAction('inputText', otherConsiderations.giveDetailsHiddenTextLabel, otherConsiderations.emojiTextInput);
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.emojiExplainPartsOfClaimErrorMessage,
  });
}

export async function otherConsiderationsNavigationTests(): Promise<void> {
  if (process.env.INCOME_AND_EXPENSES === 'YES') {
    await performValidation(
      'pageNavigation',
      otherConsiderations.backLink,
      whatOtherRegularExpensesDoYouHave.mainHeader
    );
  } else {
    await performValidation('pageNavigation', otherConsiderations.backLink, incomeAndExpenses.mainHeader);
  }
}
