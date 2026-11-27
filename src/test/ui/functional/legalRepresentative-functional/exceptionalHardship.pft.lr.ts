import { exceptionalHardship, yourCircumstances } from '../../data/page-data/lr-page-data';
import { generateRandomString } from '../../utils/common/string.utils';
import { performAction, performValidation } from '../../utils/controller';

export async function exceptionalHardshipErrorValidation(): Promise<void> {
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.selectExceptionHardshipErrorMessage,
  });
  await performAction('clickRadioButton', yourCircumstances.yesRadioOption);
  await performValidation('elementToBeVisible', exceptionalHardship.youCanEnterUpToHiddenHintText);
  await performAction('inputText', exceptionalHardship.giveDetailsHiddenTextLabel, generateRandomString(501));
  await performValidation('elementToBeVisible', exceptionalHardship.tooManyCharacterHiddenHintText);
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.mustBe500CharactersOrFewerErrorMessage,
  });
  //emoji validation
  await performAction('inputText', exceptionalHardship.giveDetailsHiddenTextLabel, exceptionalHardship.emojiTextInput);
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.emojiGiveDetailsAboutExceptionalHardshipErrorMessage,
  });
}
