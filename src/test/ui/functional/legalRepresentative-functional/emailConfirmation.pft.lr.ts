import { emailConfirmation } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function emailConfirmationErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.selectIfYouKnowEmailAddressErrorMessage,
  });

  await performAction('clickRadioButton', emailConfirmation.yesRadioOption);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.enterDefendantEmailAddressErrorMessage,
  });

  await performAction('clickRadioButton', emailConfirmation.yesRadioOption);
  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.emailAddressWithMoreThan254CharTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });

  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.emailAddressWithMultipleSpecialCharTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });
  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.emailAddressWithSpaceTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });
  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.emailAddressWithSpecialCharInDomainTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });

  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.plainAddressTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });

  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, emailConfirmation.missingDomainExtensionTextInput);
  await performAction('When the user clicks the button', emailConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: emailConfirmation.thereIsAProblemErrorMessageHeader,
    message: emailConfirmation.invalidEmailAddressErrorMessage,
  });
  await performAction('inputText', emailConfirmation.enterDefendantEmailAddressHiddenTextLabel, 'test@test.com');
}
