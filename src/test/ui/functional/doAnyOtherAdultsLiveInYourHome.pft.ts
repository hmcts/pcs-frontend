import { dashboard, doAnyOtherAdultsLiveInYourHome, doYouHaveAnyOtherDependants, feedback } from '../data/page-data';
import { generateRandomString } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

export async function doAnyOtherAdultsLiveInYourHomeErrorValidation(): Promise<void> {
  //mandatory selection
  await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doAnyOtherAdultsLiveInYourHome.thereIsAProblemErrorMessageHeader,
    message: doAnyOtherAdultsLiveInYourHome.selectIfAnyOtherAdultsErrorMessage,
  });

  //no input text provided for 'Yes' radio option
  await performAction('clickRadioButton', doAnyOtherAdultsLiveInYourHome.yesRadioOption);
  await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doAnyOtherAdultsLiveInYourHome.thereIsAProblemErrorMessageHeader,
    message: doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsErrorMessage,
  });
  await performAction(
    'inputText',
    doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
    generateRandomString(501)
  );

  await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doAnyOtherAdultsLiveInYourHome.thereIsAProblemErrorMessageHeader,
    message: doAnyOtherAdultsLiveInYourHome.mustBe500ErrorMessage,
  });
}

export async function doAnyOtherAdultsLiveInYourHomeNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', doAnyOtherAdultsLiveInYourHome.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: doAnyOtherAdultsLiveInYourHome.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    doAnyOtherAdultsLiveInYourHome.backLink,
    doYouHaveAnyOtherDependants.mainHeader
  );
  await performAction('clickRadioButton', {
    question: doAnyOtherAdultsLiveInYourHome.mainHeader,
    option: doAnyOtherAdultsLiveInYourHome.noRadioOption,
  });
  await performValidation('pageNavigation', doAnyOtherAdultsLiveInYourHome.saveForLaterButton, dashboard.mainHeader);
}
