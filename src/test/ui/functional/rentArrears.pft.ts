import { rentArrears } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function rentArrearsErrorValidation(): Promise<void> {
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.doYouOweThisAmountErrorMessage,
  });
  await performAction('clickRadioButton', {
    question: rentArrears.doYouOweThisQuestion,
    option: rentArrears.noRadioOption,
  });
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterHowMuchYouBelieveErrorMessage,
  });
  await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrears.negativeTextInput);
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.theAmountYouBelieveErrorMessage,
  });
  await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrears.incorrectFormatTextInput);
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterAmountInCorrectFormat,
  });
  // await performAction(
  //   'inputText',
  //   rentArrears.howMuchDoYouBelieveHiddenTextLabel,
  //   rentArrears.billionTextInput
  // );
  // await performAction('clickButton', rentArrears.saveAndContinueButton);
  // await performValidation('errorMessage', {
  //   header: rentArrears.thereIsAProblemErrorMessageHeader,
  //   message: rentArrears.lessThanBillionErrorMessage,
  // });
  await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrears.rentAmountTextInput);
  await performAction('clickButton', rentArrears.saveAndContinueButton);
}
