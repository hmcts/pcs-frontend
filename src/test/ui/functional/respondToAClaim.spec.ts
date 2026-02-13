import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddressKnown,
  counterClaim,
  dateOfBirth,
  defendantNameCapture,
  disputeClaimInterstitial,
  freeLegalAdvice,
  paymentInterstitial,
  startNow,
  tenancyDetails,
} from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

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

test.describe('Respond to a claim - functional @nightly', async () => {
  test('Free legal advice - Error messages - Save for later Validations', async () => {
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: freeLegalAdvice.errorValidation,
      validationType: freeLegalAdvice.errorValidationType.radio,
      inputArray: freeLegalAdvice.errorValidationField.errorRadioMsg,
      question: freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion,
      header: freeLegalAdvice.errorValidationHeader,
    });
    await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
    await performAction('clickButton', freeLegalAdvice.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Defendant name capture - Error messages - save for later Validations', async () => {
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

  test('Defendant Date of birth - Error messages - save for later Validations', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performAction('clickButton', dateOfBirth.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: dateOfBirth.errorValidation,
      validationType: dateOfBirth.errorValidationType.input,
      inputArray: dateOfBirth.errorValidationField.errorTextField,
      header: dateOfBirth.errorValidationHeader,
    });
  });

  test('Correspondent Address Known - Error messages - save for later Validations', async () => {
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
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.radio,
      inputArray: correspondenceAddressKnown.errorValidationField.errorRadioMsg,
      question: correspondenceAddressKnown.mainHeader,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction('clickRadioButton', correspondenceAddressKnown.noRadioOption);
    await performAction('clickButton', correspondenceAddressKnown.findAddressHiddenButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.input,
      inputArray: correspondenceAddressKnown.errorValidationField.errorTextField1,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction('inputText', correspondenceAddressKnown.enterUKPostcodeHiddenTextLabel, '12345');
    await performAction('clickButton', correspondenceAddressKnown.findAddressHiddenButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.input,
      inputArray: correspondenceAddressKnown.errorValidationField.errorTextField2,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction(
      'inputText',
      correspondenceAddressKnown.enterUKPostcodeHiddenTextLabel,
      correspondenceAddressKnown.englandPostcodeTextInput
    );
    await performAction('clickButton', correspondenceAddressKnown.findAddressHiddenButton);
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.input,
      inputArray: correspondenceAddressKnown.errorValidationField.errorTextField3,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction(
      'select',
      correspondenceAddressKnown.addressSelectHiddenLabel,
      correspondenceAddressKnown.addressIndex
    );
    await performAction('inputText', correspondenceAddressKnown.addressLine1HiddenTextLabel, '');
    await performAction('inputText', correspondenceAddressKnown.townOrCityHiddenTextLabel, '');
    await performAction('inputText', correspondenceAddressKnown.postcodeHiddenTextLabel, '');
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.input,
      inputArray: correspondenceAddressKnown.errorValidationField.errorTextField4,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction(
      'inputText',
      correspondenceAddressKnown.addressLine1HiddenTextLabel,
      correspondenceAddressKnown.englandAddressLine1TextInput
    );
    await performAction(
      'inputText',
      correspondenceAddressKnown.townOrCityHiddenTextLabel,
      correspondenceAddressKnown.englandTownOrCityTextInput
    );
    await performAction('inputText', correspondenceAddressKnown.postcodeHiddenTextLabel, 'ABED');
    await performAction('clickButton', correspondenceAddressKnown.saveAndContinueButton);
    await performAction('inputErrorValidation', {
      validationReq: correspondenceAddressKnown.errorValidation,
      validationType: correspondenceAddressKnown.errorValidationType.input,
      inputArray: correspondenceAddressKnown.errorValidationField.errorTextField1,
      header: correspondenceAddressKnown.errorValidationHeader,
    });
    await performAction('clickRadioButton', correspondenceAddressKnown.yesRadioOption);
    await performAction('clickButton', correspondenceAddressKnown.saveForLaterButton);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Dispute claim interstitial - back and cancel link Validations', async () => {
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
    await performAction('clickLink', disputeClaimInterstitial.backLink);
    await performValidation('mainHeader', contactPreference.mainHeader);
    await performAction('clickButton', contactPreference.saveAndContinueButton);
    await performAction('clickButton', disputeClaimInterstitial.cancelLink);
    await performValidation('mainHeader', 'Dashboard');
  });

  test('Payment interstitial - back and cancel link Validations', async () => {
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
    await performAction('clickButton', disputeClaimInterstitial.continueButton);
    await performValidation('mainHeader', tenancyDetails.mainHeader);
    await performAction('clickButton', tenancyDetails.saveAndContinueButton);
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('clickLink', paymentInterstitial.backLink);
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('clickLink', paymentInterstitial.cancelLink);
    await performValidation('mainHeader', 'Dashboard');
  });
});
