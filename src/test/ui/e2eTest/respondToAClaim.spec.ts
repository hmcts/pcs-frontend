import { test } from '@playwright/test';
import config from 'config';

import { freeLegalAdvice, startNow } from '../data/page-data';
import { defendantDateOfBirth } from '../data/page-data/defendantDateOfBirth.page.data';
import { defendantNameCapture } from '../data/page-data/defendantNameCapture.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  //await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  //await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  await performAction('navigateToUrl', home_url);
  await performAction('createUserAndLogin', 'citizen', ['citizen']);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim @PR @nightly', async () => {
  test('Respond to a claim', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameInputText,
      lName: defendantNameCapture.lastNameInputText,
    });
    await performValidation('mainHeader', defendantDateOfBirth.mainHeader);
  });
});
