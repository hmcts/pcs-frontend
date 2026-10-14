import { howMuchAffordToPay } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function howMuchAffordToPayErrorValidation(): Promise<void> {
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message1: howMuchAffordToPay.selectHowFrequentlyDefendantCouldAffordErrorMessage,
    message2: howMuchAffordToPay.enterHowMuchDefendantCouldAffordErrorMessage,
  });
  //amount exceeding max allowed value
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldDefendantAffordToPayTextLabel,
    howMuchAffordToPay.billionTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.weeklyRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.mustBeLessThanBillionErrorMessage,
  });
  //negative value entered
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldDefendantAffordToPayTextLabel,
    howMuchAffordToPay.negativeTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.every2WeeksRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.negativeValueErrorMessage,
  });
  //incorrect format
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldDefendantAffordToPayTextLabel,
    howMuchAffordToPay.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.every4weeksRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.enterAmountInTheCorrectFormatErrorMessage,
  });
}
