import { dashboard, doYouHaveAnyDependantChildren, doYouHaveAnyOtherDependants, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
  await performAction(
    'inputText',
    doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel,
    doYouHaveAnyOtherDependants.detailsCharLimitInputText
  );
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
