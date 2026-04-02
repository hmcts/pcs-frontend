import { dashboard,
  wouldYouHaveSomeoneElse,
  yourCircumstances } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(501);

export async function yourCircumstancesErrorValidation(): Promise<void> {
  await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: yourCircumstances.thereIsAProblemErrorMessageHeader,
    message: yourCircumstances.selectCircumstancesErrorMessage,
  });
  await performAction('clickRadioButton', yourCircumstances.yesRadioOption);
  await performValidation('elementToBeVisible', yourCircumstances.youCanEnterUpToHiddenHintText);
  await performAction('inputText', yourCircumstances.giveDetailsHiddenTextLabel, overMaxLengthString);
  await performValidation('elementToBeVisible', yourCircumstances.tooManyCharacterHiddenHintText);
  await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: yourCircumstances.thereIsAProblemErrorMessageHeader,
    message: yourCircumstances.mustBe500CharactersOrFewerErrorMessage,
  });
}

export async function yourCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourCircumstances.backLink, wouldYouHaveSomeoneElse.mainHeader);
  await performAction('clickRadioButton', yourCircumstances.noRadioOption);
  await performValidation('pageNavigation', yourCircumstances.saveForLaterButton, dashboard.mainHeader);
}
