import { contactPreferenceEmailOrPost, correspondenceAddress } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactPreferenceEmailOrPostErrorValidation(): Promise<void> {
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.selectHowYouWantToReceiveUpdatesErrorMessage,
  });

  await performAction('clickRadioButton', contactPreferenceEmailOrPost.byEmailRadioOption);
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.enterEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.emailAddressWithMoreThan250CharTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.emailAddressWithSpecialCharTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
}

export async function contactPreferenceEmailOrPostNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    contactPreferenceEmailOrPost.backLink,
    correspondenceAddress.correspondenceAddressKnownMainHeader
  );
  await performAction('clickRadioButton', contactPreferenceEmailOrPost.byPostRadioOption);
  await performValidation('pageNavigation', contactPreferenceEmailOrPost.saveForLaterButton, 'Dashboard');
}
