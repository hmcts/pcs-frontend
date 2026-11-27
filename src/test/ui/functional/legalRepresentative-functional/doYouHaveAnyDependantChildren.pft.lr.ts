import { doYouHaveAnyDependantChildren } from '../../data/page-data/lr-page-data';
import { generateRandomString } from '../../utils/common/string.utils';
import { performAction, performValidation } from '../../utils/controller';

const charLimitInputText = generateRandomString(501);
export async function doYouHaveAnyDependantChildrenErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.selectIfYouHaveAnyDependentChildrenErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.yesRadioOption);
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.giveDetailsAboutYourDependentChildrenErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.yesRadioOption);
  await performAction('inputText', doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel, charLimitInputText);
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.mustBeUnderCharacterLimitErrorMessage,
  });

  //Test: emoji
  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.yesRadioOption);
  await performAction(
    'inputText',
    doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel,
    doYouHaveAnyDependantChildren.emojiTextInput
  );
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.emojiErrorMessage,
  });
}
