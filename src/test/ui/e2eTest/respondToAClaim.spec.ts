import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddressKnown,
  counterClaim,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  freeLegalAdvice,
  nonRentArrearsDispute,
  noticeDetails,
  registeredLandlord,
  repaymentsMade,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { repaymentsAgreed } from '../data/page-data/repaymentsAgreed.page.data';
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

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  // Wales postcode routing is not implemented yet, e2e test coverage, functional test coverage needs to be reviewed once HDPI-3451 is done
  test.skip('Respond to a claim - Wales postcode @noDefendants', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234123412341234/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
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
      radioOption: correspondenceAddressKnown.noRadioOption,
      postcode: correspondenceAddressKnown.englandPostcodeTextInput,
      addressIndex: correspondenceAddressKnown.addressIndex,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performValidation('mainHeader', registeredLandlord.mainHeader);
    await performAction('clickButton', registeredLandlord.continueButton);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    //Added below pages to welsh journey as per english journey
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    // placeholder page, so need to be replaced with custom action when actual page is implemented
    await performValidation('mainHeader', repaymentsMade.mainHeader);
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  });

  //Rent Arrears claim type = false, Notice Date Provided string = true, and Notice Served boolean = true
  test('Non-RentArrears - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known', async () => {
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
      radioOption: correspondenceAddressKnown.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
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
      radioOption: correspondenceAddressKnown.yesRadioOption,
    });
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
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
      radioOption: correspondenceAddressKnown.yesRadioOption,
    });
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('disputeClaimInterstitial', submitCaseApiData.submitCasePayload.isClaimantNameCorrect);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
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
