import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { finaliseAllValidations, initializeExecutor, performAction } from '../../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/make-an-application/choose-an-application`);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test('Select application initial setup', async () => {
    console.log('inside app');
  });
});
