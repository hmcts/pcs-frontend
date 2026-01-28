import { test } from '@playwright/test';
import config from 'config';

//Below lines are commented to avoid API calls until data setup is integrated.
//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { dateOfBirth, defendantNameCapture, freeLegalAdvice, startNow } from '../data/page-data';
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
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + '/case/1234123412341234/respond-to-claim/start-now');
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
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
    await performAction('clickButton', defendantNameCapture.saveForLaterButton);
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
});
