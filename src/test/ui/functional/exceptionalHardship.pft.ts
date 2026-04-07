import { dashboard, exceptionalHardship, feedback, freeLegalAdvice, yourCircumstances } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

export async function yourExceptionalHardShipErrorValidation(): Promise<void> {
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
}

export async function yourExceptionalHardshipNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', exceptionalHardship.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: exceptionalHardship.pageSlug,
  });
  await performValidation('pageNavigation', yourCircumstances.backLink, yourCircumstances.mainHeader);
  await performAction('clickRadioButton', yourCircumstances.noRadioOption);
  await performValidation('pageNavigation', exceptionalHardship.saveForLaterButton, dashboard.mainHeader);
}
