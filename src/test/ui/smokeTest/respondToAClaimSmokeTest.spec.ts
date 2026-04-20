import { test } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { freeLegalAdvice, startNow } from '../data/page-data';
import { initializeExecutor, performAction } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.describe('Respond to a claim - smoke test @health', async () => {
  test('Respond to a claim @health', async ({ page }) => {
    initializeExecutor(page);
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
    await performAction('fetchPINsAPI');
    await performAction('createUser', 'citizen', ['citizen']);
    await performAction('validateAccessCodeAPI');
    await performAction('navigateToUrl', home_url);
    await performAction('login');
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('clickButton', startNow.startNowButton);
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });
});
