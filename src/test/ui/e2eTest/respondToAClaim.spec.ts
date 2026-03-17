import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactByTelephone,
  contactByTextMessage,
  contactPreferenceEmailOrPost,
  correspondenceAddress,
  counterClaim,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  freeLegalAdvice,
  nonRentArrearsDispute,
  noticeDetails,
  rentArrearsDispute,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDateDetails,
  tenancyDetails,
} from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
} from '../utils/validations/custom-validations';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }
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
  PageNavigationValidation.finaliseTest();
});

//@noDefendants(submitCasePayloadNoDefendants) represents all defendant details unknown pages and non-rent arrears
//All defendant details known pages and Rent-arrears routing is covered in submitCasePayload
//Mix and match of testcases needs to updated in e2etests once complete routing is implemented. ex: (Tendency type HDPI-3316 etc.)
test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.yesRadioOption,
      phoneNumber: contactByTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactByTextMessage.yesRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
  });

  test('Non-RentArrears - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.yesRadioOption,
      phoneNumber: contactByTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactByTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown');
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
  });

  test('Non-RentArrears - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails');
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.yesRadioOption,
      phoneNumber: contactByTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactByTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
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

  test('Non-RentArrears - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - Im not sure - NonRentArrearsDispute @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.preferNotToSayRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown');
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

  test('Non-RentArrears - NoticeServed - Yes NoticeDetails - No - NonRentArrearsDispute @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails');
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
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

  test('England - NonRentArrears - NoticeServed - No NoticeDateProvided - No - NonRentArrearsDispute @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('enterTenancyStartDetailsUnKnown');
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
  });

  test('RentArrears - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
    await performAction('confirmDefendantDetails', {
      question: defendantNameConfirmation.mainHeader,
      option: defendantNameConfirmation.noRadioOption,
      fName: defendantNameConfirmation.firstNameInputText,
      lName: defendantNameConfirmation.lastNameInputText,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.yesRadioOption,
    });
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });

  test('RentArrears - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @regression', async () => {
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.yesRadioOption,
    });
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', {
      day: '25',
      month: '2',
      year: '2020',
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
  });

  test('RentArrears - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - No - RentArrearsDispute @regression', async () => {
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('selectNoticeDetails', {
      option: noticeDetails.noRadioOption,
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });

  test('RentArrears - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - Im not sure - RentArrearsDispute @regression', async () => {
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.iAmNotSureRadioOption,
    });
    await performAction('selectNoticeDetails', {
      option: noticeDetails.imNotSureRadioOption,
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performValidation('mainHeader', repaymentsAgreed.mainHeader);
  });

  test('England - RentArrears - NoticeServed - No NoticeDateProvided - No - RentArrearsDispute @regression', async () => {
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
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byPostRadioOption,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactByTelephone.noRadioOption,
    });
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
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
