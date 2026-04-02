import { dashboard, exceptionalHardship, yourCircumstances } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(501);

export async function yourExceptionalHarshipErrorValidation(): Promise<void> {
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.selectExceptionHardshipErrorMessage,
  });
  await performAction('clickRadioButton', yourCircumstances.yesRadioOption);
  await performValidation('elementToBeVisible', exceptionalHardship.youCanEnterUpToHiddenHintText);
  await performAction('inputText', exceptionalHardship.giveDetailsHiddenTextLabel, overMaxLengthString);
  await performValidation('elementToBeVisible', exceptionalHardship.tooManyCharacterHiddenHintText);
  await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: exceptionalHardship.thereIsAProblemErrorMessageHeader,
    message: exceptionalHardship.mustBe500CharactersOrFewerErrorMessage,
  });
}

export async function yourExceptionalHardshipNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourCircumstances.backLink, yourCircumstances.mainHeader);
  await performAction('clickRadioButton', yourCircumstances.noRadioOption);
  await performValidation('pageNavigation', exceptionalHardship.saveForLaterButton, dashboard.mainHeader);
}
