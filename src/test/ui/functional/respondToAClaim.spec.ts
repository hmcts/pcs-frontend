import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData, submitCaseApiDataWithoutDefendantsData } from '../data/api-data';
import { startNow } from '../data/page-data';
import { initializeExecutor, performAction } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('navigateToUrl', home_url);
  await performAction('createUserAndLogin', 'citizen', ['citizen']);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim @PR @nightly', async () => {
  test('Respond to a claim', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
  });

  test('Respond to a claim without dependents', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiDataWithoutDefendantsData.submitCasePayload });
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
  });
});
