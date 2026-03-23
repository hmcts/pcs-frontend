import { dashboard, rentArrears } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function rentArrearsErrorValidation(): Promise<void> {
  // mandatory radio button selection
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.selectIfYouOweErrorMessage,
  });
  await performAction('clickRadioButton', rentArrears.noRadioOption);
  //mandatory input field validation for 'No' radio button selection
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterHowMuchYouBelieveErrorMessage,
  });
  //amount exceeding max allowed value
  await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrears.billionTextInput);
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.lessThanBillionErrorMessage,
  });
  //negative value entered
  await performAction('inputText', rentArrears.howMuchDoYouBelieveHiddenTextLabel, rentArrears.negativeTextInput);
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.theAmountYouBelieveErrorMessage,
  });
  //incorrect format
  await performAction(
    'inputText',
    rentArrears.howMuchDoYouBelieveHiddenTextLabel,
    rentArrears.incorrectFormatTextInput
  );
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.enterAmountInCorrectFormat,
  });
}

export async function rentArrearsNavigationTests(): Promise<void> {
  // if NoticeDateProvided = no then go to NoticeDateUnknown
  // if NoticeDateProvided = yes then go to NoticeDateKnown
  // if NoticeServed = No then go to
  //   await performValidation(
  //     'pageNavigation',
  //     rentArrears.backLink,
  //     not.getMainHeader(claimantsName)
  //   );

  await performValidation('pageNavigation', rentArrears.saveForLaterButton, dashboard.mainHeader);
}
