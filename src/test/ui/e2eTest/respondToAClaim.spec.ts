import { test } from '@playwright/test';
import config from 'config';

//Below lines are commented to avoid API calls until data setup is integrated.
//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { defendantDateOfBirth, defendantNameCapture, freeLegalAdvice, startNow } from '../data/page-data';
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
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim @nightly', async () => {
  test('Respond to a claim', async () => {
    await performAction('navigateToUrl', home_url + '/case/1234567891234567/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performValidation('mainHeader', defendantDateOfBirth.mainHeader);
  });
});
