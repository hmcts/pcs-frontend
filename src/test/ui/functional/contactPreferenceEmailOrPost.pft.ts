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
    contactPreferenceEmailOrPost.emailAddressWithMultipleSpecialCharTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.emailAddressWithSpaceTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.emailAddressWithSpecialCharInDomainTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.emailAddressWithSpecialCharInDomainTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.plainAddressTextInput
  );
  await performAction('clickButton', contactPreferenceEmailOrPost.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferenceEmailOrPost.thereIsAProblemErrorMessageHeader,
    message: contactPreferenceEmailOrPost.invalidEmailAddressErrorMessage,
  });
  await performAction(
    'inputText',
    contactPreferenceEmailOrPost.enterEmailAddressHiddenTextLabel,
    contactPreferenceEmailOrPost.missingDomainExtensionTextInput
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
    correspondenceAddress.correspondenceAddressUnKnownMainHeader
  );
  await performAction('clickRadioButton', contactPreferenceEmailOrPost.byPostRadioOption);
  await performValidation('pageNavigation', contactPreferenceEmailOrPost.saveForLaterButton, 'Dashboard');
}
