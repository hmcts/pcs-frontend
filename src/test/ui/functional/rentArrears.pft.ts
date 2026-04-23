import { rentArrears } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function rentArrearsErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent:
      'Rent arrears: mandatory “do you owe”; when No, amount required; format and cap checks (see nested steps for full list).',
    screenTitle: rentArrears.mainHeader,
    actionsOrInputs: [
      'Save without selecting whether respondent owes the stated arrears.',
      'Select No, then save without amount; invalid / over-limit amounts per PFT.',
    ],
    expectedAssertions: [
      {
        label: 'Owe amount — choice required',
        summaryTitle: rentArrears.thereIsAProblemErrorMessageHeader,
        messageContains: rentArrears.selectIfYouOweErrorMessage,
      },
      {
        label: 'Amount required when No',
        summaryTitle: rentArrears.thereIsAProblemErrorMessageHeader,
        messageContains: rentArrears.enterHowMuchYouBelieveErrorMessage,
      },
    ],
  };
}

export async function rentArrearsErrorValidation(): Promise<void> {
  // mandatory radio button selection
  await performAction('clickButton', rentArrears.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: rentArrears.thereIsAProblemErrorMessageHeader,
    message: rentArrears.selectIfYouOweErrorMessage,
  });
  await performAction('clickRadioButton', {
    question: rentArrears.doYouOweThisQuestion,
    option: rentArrears.noRadioOption,
  });
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

// Need to fix this as part of HDPI-5786
// export async function rentArrearsNavigationTests(): Promise<void> {
//   if (process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'YES') {
//     if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES') {
//       await performValidation('pageNavigation', rentArrears.backLink, confirmationOfNoticeGiven.mainHeader);
//     } else {
//       await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenProvided.mainHeader);
//     }
//   } else if (process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'NO') {
//     if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES') {
//       await performValidation('pageNavigation', rentArrears.backLink, confirmationOfNoticeGiven.mainHeader);
//     } else {
//       await performValidation('pageNavigation', rentArrears.backLink, noticeDateWhenNotProvided.mainHeader);
//     }
//   }
//
//   if (process.env.NOTICE_SERVED === 'NO' && process.env.TENANCY_START_DATE_KNOWN === 'NO') {
//     await performValidation('pageNavigation', rentArrears.backLink, tenancyDateUnknown.mainHeader);
//   } else if (process.env.NOTICE_SERVED === 'NO' && process.env.TENANCY_START_DATE_KNOWN === 'YES') {
//     await performValidation('pageNavigation', rentArrears.backLink, tenancyDateDetails.mainHeader);
//   }
//   await performAction('clickRadioButton', {
//     question: rentArrears.doYouOweThisQuestion,
//     option: rentArrears.yesRadioOption,
//   });
//   await performValidation('pageNavigation', rentArrears.saveForLaterButton, dashboard.mainHeader);
// }
