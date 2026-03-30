import {
  confirmationOfNoticeGiven,
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
    message: rentArrears.enterAmountInCorrectFormatErrorMessage,
  });
}

export async function rentArrearsNavigationTests(): Promise<void> {
  console.log('pft - Notice date provided', process.env.NOTICE_DATE_PROVIDED);
  console.log('pft- Notice details page has no or im not sure selection', process.env.NOTICE_DETAILS_NO_NOTSURE);
  if (process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'YES') {
    if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES'){
      await performValidation('pageNavigation', rentArrears.backLink, confirmationOfNoticeGiven.mainHeader);
    } else {
      await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenProvided.mainHeader);
    }
  } else if ( process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'NO') {
    if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES'){
      await performValidation('pageNavigation', rentArrears.backLink, confirmationOfNoticeGiven.mainHeader);
    } else {
      await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenNotProvided.mainHeader);
    }
  }

  if ( process.env.NOTICE_SERVED === 'NO' && process.env.TENANCY_START_DATE_KNOWN === 'NO') {
    await performValidation('pageNavigation', rentArrears.backLink, tenancyDateUnknown.mainHeader);
  } else if (process.env.NOTICE_SERVED === 'NO' && process.env.TENANCY_START_DATE_KNOWN === 'YES') {
    await performValidation('pageNavigation', rentArrears.backLink, tenancyDateDetails.mainHeader);
  }

  await performAction('clickRadioButton', rentArrears.yesRadioOption);
  await performValidation('pageNavigation', rentArrears.saveForLaterButton, dashboard.mainHeader);
}
