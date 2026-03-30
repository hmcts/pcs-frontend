import {
  confirmationOfNoticeGiven,
  dashboard,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  rentArrearsDispute,
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
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  //hidden hint text for input field validation
  await performValidation('elementToBeVisible', nonRentArrearsDispute.youHave6500CharactersHiddenHintText);
  //mandatory input field validation for 'Yes' radio button selection
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.partsOfClaimDoNotAgreeErrorMessage,
  });
  //character limit error validation
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', nonRentArrearsDispute.tooManyCharacterHiddenHintText);
  //link opening in new tab validation
  await performAction(
    'clickLinkAndVerifyNewTabTitle',
    nonRentArrearsDispute.viewTheClaimLink,
    nonRentArrearsDispute.mainHeaderGovServiceHiddenNewTab
  );
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.explainClaimTextInput
  );
}

export async function noRentArrearsNavigationTests(): Promise<void> {
  if (process.env.NOTICE_DATE_PROVIDED === 'NO') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, noticeDateWhenNotProvided.mainHeader);
  } else if (process.env.NOTICE_DATE_PROVIDED === 'YES') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, noticeDateWhenProvided.mainHeader);
  } else if (process.env.TENANCY_START_DATE_KNOWN === 'NO') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, tenancyDateUnknown.mainHeader);
  } else if (process.env.TENANCY_START_DATE_KNOWN === 'YES') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, tenancyDateDetails.mainHeader);
  } else if (process.env.RENT_NON_RENT === 'YES') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, rentArrearsDispute.mainHeader);
  } else if (process.env.NOTICE_DETAILS_NO_NOTSURE === 'YES') {
    await performValidation('pageNavigation', nonRentArrearsDispute.backLink, confirmationOfNoticeGiven.mainHeader);
  }
  await performValidation('pageNavigation', nonRentArrearsDispute.saveForLaterButton, dashboard.mainHeader);
}
