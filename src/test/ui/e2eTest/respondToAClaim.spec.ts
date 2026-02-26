import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddress,
  counterClaim,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  freeLegalAdvice,
  nonRentArrearsDispute,
  noticeDetails,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { ErrorMessageValidation } from '../utils/validations/element-validations';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  if (testInfo.title.includes('@noDefendants')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  } else {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }
  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
  ErrorMessageValidation.finaliseTest();
});

test.describe('Respond to a claim - e2e Journey @nightly @PR', async () => {
  test('Respond to a claim - Wales postcode @noDefendants', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
  });

  //Rent Arrears claim type = false, Notice Date Provided string = true, and Notice Served boolean = true
  test('Non-RentArrears - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });

  //Rent Arrears claim type = false, Notice Date Provided string = false, and Notice Served boolean = true
  test('Non-RentArrears - NoticeServed - Yes NoticeDetails - Im not sure - NonRentArrearsDispute', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.preferNotToSayRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.noRadioOption,
      postcode: correspondenceAddress.englandPostcodeTextInput,
      addressIndex: correspondenceAddress.addressIndex,
    });
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.imNotSureRadioOption,
    });
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.yesRadioOption,
      repaymentInfo: repaymentsMade.detailsTextInput,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });

  //Rent Arrears claim type = false, Notice Date Provided string = false, and Notice Served boolean = true
  test('Non-RentArrears - NoticeServed - Yes NoticeDetails - No - NonRentArrearsDispute', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.yesRadioOption,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.noRadioOption,
    });
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });
});
