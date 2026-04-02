import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  correspondenceAddress,
  dashboard,
  dateOfBirth,
  defendantNameConfirmation,
  freeLegalAdvice,
  startNow,
} from '../data/page-data';
import { captureProcessEnvBeforeBeforeEach, logTestBeforeEachContext } from '../utils/common/pft-debug-log';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }, testInfo) => {
  captureProcessEnvBeforeBeforeEach();
  initializeExecutor(page);
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
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
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  console.log('caseId', process.env.CASE_NUMBER);
  await performAction('clickButton', startNow.startNowButton);
  logTestBeforeEachContext();
});

//This test case will be deleted once correspondence address functional tests automatically handle page routing - will be implemented in a new story
test.describe('Correspondence Address - functional test @nightly', async () => {
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
    await performValidation('mainHeader', dashboard.mainHeader);
  });
});
