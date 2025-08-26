import { test } from '@playwright/test';
import { parentSuite } from 'allure-js-commons';
import config from 'config';

import { eligibility } from '../data/page-data/eligibility.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const claim_url = (config.get('e2e.testUrl') as string) + config.get('e2e.claimFormTestData.eligibility');

test.beforeEach(async ({ page }, testInfo) => {
  await parentSuite('Home Page');
  await testInfo.attach('Page URL', {
    body: claim_url,
    contentType: 'text/plain',
  });
  initializeExecutor(page);
  await performAction('navigateToUrl', claim_url);
  await performAction('createUserAndLogin', ['citizen']);
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Verify language toggle and bilingual content support (English/Welsh)', async () => {
    await performAction('clickLink', 'Cymraeg');
    await performValidation('mainHeader', eligibility.mainHeaderWelsh);
    await performAction('clickLink', 'English');
    await performValidation('mainHeader', eligibility.mainHeaderEnglish);
  });
});
