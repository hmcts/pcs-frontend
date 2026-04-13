import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import { freeLegalAdvice, startNow } from '../data/page-data';
import { initializeExecutor, performAction } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.describe('Respond to a claim - smoke test @smoke', async () => {
  test('Respond to a claim @smoke', async ({ page }) => {
    initializeExecutor(page);
    // process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
    // process.env.NOTICE_SERVED = 'YES';
    // process.env.RENT_NON_RENT = 'YES';
    // process.env.NOTICE_DETAILS_NO_NOTSURE = 'NO';
    // process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    // await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    // await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    process.env.CLAIMANT_NAME = submitCaseApiDataWales.submitCasePayload.claimantName;
    await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCasePayload });
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
