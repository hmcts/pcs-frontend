import { defendantNameConfirmation } from '../../data/page-data/lr-page-data';
import { getPinUserAt } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { performAction, performValidation } from '../../utils/controller';
export async function defendantNameConfirmationErrorValidation(): Promise<void> {
  // Test: Error message validation for mandatory radio button selection
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  const pin2User = await getPinUserAt(1);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.youMustSayErrorMessage(pin2User.firstName, pin2User.lastName),
  });
  // Test: Both first name and last name text fields are empty
  await performAction('clickRadioButton', defendantNameConfirmation.noRadioOption);
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterDefendantFirstNameErrorMessage,
  });
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.enterDefendantLastNameErrorMessage,
  });
  //Test: Both first name and last name for emoji
  await performAction(
    'inputText',
    defendantNameConfirmation.defendantFirstNameHiddenTextLabel,
    defendantNameConfirmation.emojiTextInput
  );
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.emojiFirstNameErrorMessage,
  });
  await performAction(
    'inputText',
    defendantNameConfirmation.defendantLastNameHiddenTextLabel,
    defendantNameConfirmation.emojiTextInput
  );
  await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantNameConfirmation.thereIsAProblemErrorMessageHeader,
    message: defendantNameConfirmation.emojiLastNameErrorMessage,
  });
}
