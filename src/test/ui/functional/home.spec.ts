import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { home } from '../data/page-data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  await performAction('navigateToUrl', home_url);
  await performAction('createUserAndLogin', 'citizen', ['citizen']);
});

test.describe('Possession claims @PR @nightly', async () => {
  test('Verify home page', async () => {
    await performValidation('mainHeader', home.mainHeader);
    await performAction('clickLink', home.logOutLink);
  });
});
