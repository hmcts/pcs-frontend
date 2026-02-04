import { test } from '@playwright/test';
import config from 'config';

//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddressKnown,
  dateOfBirth,
  defendantNameCapture,
  disputeClaimInterstitial,
  freeLegalAdvice,
  noticeDetails,
  registeredLandlord,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  //await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  //await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  //await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  //await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url + '/case/1234567891234567/respond-to-claim/start-now');
  await performAction('login');
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - England postcode', async () => {
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
      radioOption: correspondenceAddressKnown.yesRadioOption,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mockText);
  });

  // Wales postcode routing is not implemented yet, launch darkly flags are used as of now
  test.skip('Respond to a claim - Wales postcode', async () => {
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
      radioOption: correspondenceAddressKnown.noRadioOption,
      postcode: correspondenceAddressKnown.englandPostcodeTextInput,
      addressIndex: correspondenceAddressKnown.addressIndex,
    });
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', registeredLandlord.mockText);
  });

  test('Rent Arrears - NoticeServed - Yes and NoticeDateProvided - Yes - Notice date known', async () => {
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
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mockText);
    await performAction('clickButton', 'Save and continue');
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
      option: noticeDetails.yesRadioOption  });
    await performAction('enterNoticeDateKnown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    //rent arrears screen
  });

  test('NON-Rent Arrears - NoticeServed - Yes and NoticeDateProvided - No - Notice date unknown', async () => {
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
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mockText);
    await performAction('clickButton', 'Save and continue');
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
      option: noticeDetails.yesRadioOption  });
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    // progress to non-rent arrears screen?????
  });

  test('Rent Arrears - NoticeServed - Yes and NoticeDateProvided - No - Notice date unknown', async () => {
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
    await performValidation('mainHeader', disputeClaimInterstitial.mainHeader);
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mockText);
    await performAction('clickButton', 'Save and continue');
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performAction('selectNoticeDetails', {
      question: noticeDetails.didClaimantGiveYouQuestion,
      option: noticeDetails.yesRadioOption  });
    //await performValidation('mainHeader', noticeDateUnknown.mainHeader);
    await performAction('enterNoticeDateUnknown');
    // progress to rent arrears or non-rent arrears screen?????
  });
});
