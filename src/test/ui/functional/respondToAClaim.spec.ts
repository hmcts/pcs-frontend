import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  contactPreference,
  correspondenceAddress,
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

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
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
      radioOption: correspondenceAddress.yesRadioOption,
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
