import {
  confirmationOfNoticeGiven,
  dashboard,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  tenancyDateDetails,
  tenancyDateUnknown,
} from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function nonRentArrearsDisputeErrorValidation(): Promise<void> {
  //mandatory radio button selection
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.selectIfYouWantToDisputeErrorMessage,
  });
  //mandatory input field validation for 'Yes' radio button selection
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.partsOfClaimDoNotAgreeErrorMessage,
  });
  await performAction(
    'clickLinkAndVerifyNewTabTitle',
    nonRentArrearsDispute.viewTheClaimLink,
    nonRentArrearsDispute.titleGovServiceHiddenNewTab
  );
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.explainClaimTextInput
  );
}

//This test has to be modified.
export async function noRentArrearsNavigationTests(): Promise<void> {
  if (process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'YES') {
    if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES') {
      await performValidation('pageNavigation', nonRentArrearsDispute.backLink, confirmationOfNoticeGiven.mainHeader);
    } else {
      await performValidation('pageNavigation', nonRentArrearsDispute.backLink, noticeDateWhenProvided.mainHeader);
    }
  } else if (process.env.NOTICE_SERVED === 'YES' && process.env.NOTICE_DATE_PROVIDED === 'NO') {
    if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES') {
      await performValidation('pageNavigation', nonRentArrearsDispute.backLink, confirmationOfNoticeGiven.mainHeader);
    } else {
      await performValidation('pageNavigation', nonRentArrearsDispute.backLink, noticeDateWhenNotProvided.mainHeader);
    }
  }

  if (
    process.env.NOTICE_SERVED === 'NO' &&
    process.env.TENANCY_START_DATE_KNOWN === 'NO' &&
    process.env.RENT_NON_RENT === 'NO'
  ) {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, tenancyDateUnknown.mainHeader);
  } else if (
    process.env.NOTICE_SERVED === 'NO' &&
    process.env.TENANCY_START_DATE_KNOWN === 'YES' &&
    process.env.RENT_NON_RENT === 'NO'
  ) {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, tenancyDateDetails.mainHeader);
  }
  //enable after 3495 is merged

  // else if (
  //   process.env.NOTICE_SERVED === 'NO' &&
  //   process.env.TENANCY_START_DATE_KNOWN === 'YES' &&
  //   process.env.RENT_NON_RENT === 'YES'
  // ) {
  //   await performValidation('pageNavigation', nonRentArrearsDispute.backLink, rentArrearsDispute.mainHeader);
  // }
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performValidation('pageNavigation', nonRentArrearsDispute.saveForLaterButton, dashboard.mainHeader);
}

export async function nonRentArrearsDisputeVisibilityValidationTests(): Promise<void> {
  await performAction('inputText', nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel, '');
  await performValidation('elementToBeVisible', nonRentArrearsDispute.youHave6500CharactersHiddenHintText);
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', nonRentArrearsDispute.tooManyCharacterHiddenHintText);
}
