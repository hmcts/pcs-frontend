import { dashboard, doYouHaveAnyDependantChildren, doYouHaveAnyOtherDependants, feedback } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

const charLimitInputText = generateRandomString(501);
export async function doYouHaveAnyOtherDependantsErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyOtherDependants.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyOtherDependants.selectIfYouHaveAnyOtherDependantsErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyOtherDependants.yesRadioOption);
  await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyOtherDependants.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyOtherDependants.giveDetailsAboutYourOtherDependantsErrorMessage,
  });

  await performAction('clickRadioButton', doYouHaveAnyOtherDependants.yesRadioOption);
  await performAction('inputText', doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel, charLimitInputText);
  await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveAnyOtherDependants.thereIsAProblemErrorMessageHeader,
    message: doYouHaveAnyOtherDependants.mustBeUnderCharacterLimitErrorMessage,
  });
}

export async function doYouHaveAnyOtherDependantsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doYouHaveAnyOtherDependants.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: doYouHaveAnyOtherDependants.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    doYouHaveAnyOtherDependants.backLink,
    doYouHaveAnyDependantChildren.mainHeader
  );
  await performAction('clickRadioButton', doYouHaveAnyOtherDependants.noRadioOption);
  await performValidation('pageNavigation', doYouHaveAnyOtherDependants.saveForLaterButton, dashboard.mainHeader);
}
