import { doAnyOtherAdultsLiveInYourHome } from '../../data/page-data/lr-page-data';
import { generateRandomString } from '../../utils/common/string.utils';
import { performAction, performValidation } from '../../utils/controller';

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

  //enter emoji
  await performAction(
    'inputText',
    doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
    doAnyOtherAdultsLiveInYourHome.emojiTextInput
  );

  await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doAnyOtherAdultsLiveInYourHome.thereIsAProblemErrorMessageHeader,
    message: doAnyOtherAdultsLiveInYourHome.emojiErrorMessage,
  });
}
