import { rentArrears } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function rentArrearsErrorValidation(): Promise<void> {
  // mandatory radio button selection
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.selectIfDefendantOwesErrorMessage,
  });
  await performAction('clickRadioButton', {
    question: rentArrears.doesDefendantOweThisQuestion,
    option: rentArrears.noRadioOption,
  });
  //mandatory input field validation for 'No' radio button selection
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterAmountDefendantBelievesBelieveErrorMessage,
  });
  //amount exceeding max allowed value
  await performAction(
    'inputText',
    rentArrears.howMuchDoesDefendantBelieveHiddenTextLabel,
    rentArrears.billionTextInput
  );
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.lessThanBillionErrorMessage,
  });
  //negative value entered
  await performAction(
    'inputText',
    rentArrears.howMuchDoesDefendantBelieveHiddenTextLabel,
    rentArrears.negativeTextInput
  );
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.theAmountDefendantBelieveErrorMessage,
  });
  //incorrect format
  await performAction(
    'inputText',
    rentArrears.howMuchDoesDefendantBelieveHiddenTextLabel,
    rentArrears.incorrectFormatTextInput
  );
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterAmountInCorrectFormatErrorMessage,
  });
}
