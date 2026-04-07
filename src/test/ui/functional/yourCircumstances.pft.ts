import { dashboard, feedback, freeLegalAdvice, wouldYouHaveSomeoneElse, yourCircumstances } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

export async function yourCircumstancesErrorValidation(): Promise<void> {
  await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: yourCircumstances.thereIsAProblemErrorMessageHeader,
    message: yourCircumstances.selectCircumstancesErrorMessage,
  });
  await performAction('clickRadioButton', yourCircumstances.yesRadioOption);
  await performValidation('elementToBeVisible', yourCircumstances.youCanEnterUpToHiddenHintText);
  await performAction('inputText', yourCircumstances.giveDetailsHiddenTextLabel, generateRandomString(501));
  await performValidation('elementToBeVisible', yourCircumstances.tooManyCharacterHiddenHintText);
  await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: yourCircumstances.thereIsAProblemErrorMessageHeader,
    message: yourCircumstances.mustBe500CharactersOrFewerErrorMessage,
  });
}

export async function yourCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourCircumstances.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: freeLegalAdvice.pageSlug,
  });
  await performValidation('pageNavigation', yourCircumstances.backLink, wouldYouHaveSomeoneElse.mainHeader);
  await performAction('clickRadioButton', yourCircumstances.noRadioOption);
  await performValidation('pageNavigation', yourCircumstances.saveForLaterButton, dashboard.mainHeader);
}
