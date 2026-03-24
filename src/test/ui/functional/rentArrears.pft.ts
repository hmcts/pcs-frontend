import {
  dashboard,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  rentArrears,
  tenancyDateDetails,
  tenancyDateUnknown,
} from '../data/page-data';
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
  if (process.env.NOTICE_DATE_PROVIDED === 'NO') {
    await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenNotProvided.mainHeader);
  } else if (process.env.NOTICE_DATE_PROVIDED === 'YES') {
    await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenProvided.mainHeader);
  } else if (process.env.TENANCY_START_DATE_KNOWN === 'YES') {
    await performValidation('pageNavigation', rentArrears.backLink, tenancyDateDetails.mainHeader);
  } else if (process.env.TENANCY_START_DATE_KNOWN === 'NO') {
    await performValidation('pageNavigation', rentArrears.backLink, tenancyDateUnknown.mainHeader);
  }
  await performValidation('pageNavigation', rentArrears.saveForLaterButton, dashboard.mainHeader);
}
