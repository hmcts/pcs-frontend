import { dashboard, doYouHaveAnyDependantChildren, feedback, yourHouseholdAndCircumstances } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

const charLimitInputText = generateRandomString(501);
export async function doYouHaveAnyDependantChildrenErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.selectIfYouHaveAnyDependantChildrenErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.yesRadioOption);
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.giveDetailsAboutYourDependantChildrenErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.yesRadioOption);
  await performAction('inputText', doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel, charLimitInputText);
  await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyDependantChildren.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyDependantChildren.mustBeUnderCharacterLimitErrorMessage,
  });
}

export async function doYouHaveAnyDependantChildrenNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doYouHaveAnyDependantChildren.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: doYouHaveAnyDependantChildren.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    doYouHaveAnyDependantChildren.backLink,
    yourHouseholdAndCircumstances.mainHeader
  );
  await performAction('clickRadioButton', doYouHaveAnyDependantChildren.noRadioOption);
  await performValidation('pageNavigation', doYouHaveAnyDependantChildren.saveForLaterButton, dashboard.mainHeader);
}
