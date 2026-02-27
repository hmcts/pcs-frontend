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
  disputeClaimInterstitial,
  freeLegalAdvice,
  nonRentArrearsDispute,
  noticeDateKnown,
  noticeDateUnknown,
  noticeDetails,
  paymentInterstitial,
  rentArrearsDispute,
  repaymentsMade,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { repaymentsAgreed } from '../data/page-data/repaymentsAgreed.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;
const claimantsName = submitCaseApiData.submitCasePayload.claimantName;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  if (testInfo.title.includes('@noDefendants')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  } else {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.describe('Respond to a claim - functional @nightly', async () => {
  test('Free legal advice - Save for later Validations', async () => {
    await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', freeLegalAdvice.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Defendant name capture - Error messages - save for later Validations @noDefendants', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: defendantNameCapture.errorValidation,
      validationType: defendantNameCapture.errorValidationType.input,
      inputArray: defendantNameCapture.errorValidationField.errorTextField,
      header: defendantNameCapture.errorValidationHeader,
    });
    await performAction('inputText', defendantNameCapture.firstNameLabelText, 'John');
    await performAction('inputText', defendantNameCapture.lastNameLabelText, 'Doe');
    await performAction('clickButton', defendantNameCapture.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Defendant Date of birth - Back link and Save for later Validations', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('clickLink', dateOfBirth.backLink);
    await performValidation('mainHeader', defendantNameCapture.mainHeader);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
    await performValidation('mainHeader', dateOfBirth.mainHeader);
    await performAction('clickButton', dateOfBirth.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Correspondent Address Known - Error messages - save for later Validations', async () => {
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
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.radio,
      inputArray: correspondenceAddress.errorValidationField.errorRadioMsg,
      question: correspondenceAddress.correspondenceAddressKnownMainHeader,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction('clickRadioButton', correspondenceAddress.noRadioOption);
    await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.input,
      inputArray: correspondenceAddress.errorValidationField.errorTextField1,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction('inputText', correspondenceAddress.enterUKPostcodeHiddenTextLabel, '12345');
    await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.input,
      inputArray: correspondenceAddress.errorValidationField.errorTextField2,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction(
      'inputText',
      correspondenceAddress.enterUKPostcodeHiddenTextLabel,
      correspondenceAddress.englandPostcodeTextInput
    );
    await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.input,
      inputArray: correspondenceAddress.errorValidationField.errorTextField3,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction('select', correspondenceAddress.addressSelectHiddenLabel, correspondenceAddress.addressIndex);
    await performAction('inputText', correspondenceAddress.addressLine1HiddenTextLabel, '');
    await performAction('inputText', correspondenceAddress.townOrCityHiddenTextLabel, '');
    await performAction('inputText', correspondenceAddress.postcodeHiddenTextLabel, '');
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.input,
      inputArray: correspondenceAddress.errorValidationField.errorTextField4,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction(
      'inputText',
      correspondenceAddress.addressLine1HiddenTextLabel,
      correspondenceAddress.englandAddressLine1TextInput
    );
    await performAction(
      'inputText',
      correspondenceAddress.townOrCityHiddenTextLabel,
      correspondenceAddress.englandTownOrCityTextInput
    );
    await performAction('inputText', correspondenceAddress.postcodeHiddenTextLabel, 'ABED');
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddress.errorValidation,
      validationType: correspondenceAddress.errorValidationType.input,
      inputArray: correspondenceAddress.errorValidationField.errorTextField1,
      header: correspondenceAddress.errorValidationHeader,
    });
    await performAction('clickRadioButton', correspondenceAddress.yesRadioOption);
    await performAction('clickButton', correspondenceAddress.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Dispute claim interstitial - back and cancel link Validations', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('clickLink', disputeClaimInterstitial.backLink);
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('clickButton', disputeClaimInterstitial.cancelLink);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Payment interstitial - back and cancel link Validations', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', noticeDateKnown.saveAndContinueButton);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('clickLink', paymentInterstitial.backLink);
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('clickLink', paymentInterstitial.cancelLink);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Notice Details - Error messages - Validations', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('clickButton', noticeDetails.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: noticeDetails.errorValidation,
      validationType: noticeDetails.errorValidationType.radio,
      inputArray: noticeDetails.errorValidationField.errorRadioMsg,
      question: noticeDetails.getDidClaimantGiveYouQuestion(claimantsName),
      header: noticeDetails.errorValidationHeader,
    });
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
  });

  test('Notice Date Known - Error messages - Validations', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', {
      day: '25',
      month: '2',
      year: '2050',
    });
    await performAction('inputErrorValidation', {
      validationReq: noticeDateKnown.errorValidation,
      validationType: noticeDateKnown.errorValidationType.radio,
      inputArray: noticeDateKnown.errorValidationField.errorRadioMsg,
      question: noticeDateKnown.getWhenDidYouReceiveNoticeQuestion(claimantsName),
      header: noticeDateKnown.errorValidationHeader,
    });
  });

  test('Notice Date Unknown - Error messages - Validations', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateKnown', {
      day: '25',
      month: '2',
      year: '2050',
    });
    await performAction('inputErrorValidation', {
      validationReq: noticeDateUnknown.errorValidation,
      validationType: noticeDateUnknown.errorValidationType.radio,
      inputArray: noticeDateUnknown.errorValidationField.errorRadioMsg,
      question: noticeDateUnknown.getWhenDidYouReceiveNoticeQuestion(claimantsName),
      header: noticeDateUnknown.errorValidationHeader,
    });
  });

  //Rent Arrears claim type = true, Notice Date Provided string = false, and Notice Served boolean = false
  test.skip('England - RentArrears - NoticeServed - No - RentArrearsDispute', async () => {
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
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.noRadioOption,
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = true, Notice Date Provided string = true, and Notice Served boolean = true
  test.skip('RentArrears - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    /*await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);*/
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
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
    await performAction('enterNoticeDateKnown', {
      day: '25',
      month: '2',
      year: '2020',
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = true, Notice Date Provided string = false, and Notice Served boolean = true
  test.skip('RentArrears - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    /*await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);*/
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
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
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = true, Notice Date Provided string = false, and Notice Served boolean = true
  test.skip('RentArrears - NoticeServed - Yes NoticeDetails - No - RentArrearsDispute', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    /*await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);*/
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
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
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = true, Notice Date Provided string = false, and Notice Served boolean = true
  test.skip('RentArrears - NoticeServed - Yes NoticeDetails - Im not sure - RentArrearsDispute', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    /*await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);*/
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
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
      option: noticeDetails.imNotSureRadioOption,
    });
    await performValidation('mainHeader', rentArrearsDispute.mainHeader);
    await performAction('clickButton', rentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = false, Notice Date Provided string = false, and Notice Served boolean = true
  test.skip('Non-RentArrears - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    /*await performAction('clickRadioButton', defendantNameCapture.yesRadioOption);
    await performAction ('clickButton', defendantNameCapture.saveAndContinueButton);*/
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
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
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020',
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

  //Rent Arrears claim type = false, Notice Date Provided string = false, and Notice Served boolean = false
  test.skip('England - NonRentArrears - NoticeServed - No - NonRentArrearsDispute', async () => {
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
    await performAction('selectCorrespondenceAddressKnown', {
      radioOption: correspondenceAddress.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  test('madeRepayments - mandatory selection, mandatory text box,save for later and back link', async () => {
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
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      option: noticeDetails.imNotSureRadioOption,
    });
    await performValidation('mainHeader', nonRentArrearsDispute.mainHeader);
    await performAction('clickButton', nonRentArrearsDispute.continueButton);
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('clickButton', paymentInterstitial.continueButton);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: repaymentsMade.errorValidation,
      validationType: repaymentsMade.errorValidationType.radio,
      inputArray: repaymentsMade.errorValidationField.errorRadioMsg,
      question: repaymentsMade.mainHeader,
      header: repaymentsMade.errorValidationHeader,
    });
    await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: repaymentsMade.errorValidation,
      validationType: repaymentsMade.errorValidationType.input,
      inputArray: repaymentsMade.errorValidationField.errorTextField,
      header: repaymentsMade.errorValidationHeader,
    });
    await performAction('clickLink', repaymentsMade.backLink);
    await performValidation('mainHeader', paymentInterstitial.mainHeader);
    await performAction('clickButton', paymentInterstitial.continueButton);
    await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
    await performValidation('elementToBeVisible', repaymentsMade.youHave500CharactersHiddenHintText);
    await performAction(
      'inputText',
      repaymentsMade.giveDetailsHiddenTextLabel,
      repaymentsMade.detailsCharLimitInputText
    );
    await performValidation('elementToBeVisible', repaymentsMade.tooManyCharacterHiddenHintText);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: repaymentsMade.errorValidation,
      validationType: repaymentsMade.errorValidationType.input,
      inputArray: repaymentsMade.errorValidationField.errorCharLimit,
      header: repaymentsMade.errorValidationHeader,
    });
    await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsMade.detailsTextInput);
    await performAction('clickButton', repaymentsMade.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });
});
