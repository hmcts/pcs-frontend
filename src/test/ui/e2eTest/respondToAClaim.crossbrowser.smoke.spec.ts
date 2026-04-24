import config from 'config';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';
import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { freeLegalAdvice, startNow } from '../data/page-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.describe('Respond to a claim - crossbrowser @smoke @nightly', () => {
  test('Start journey and free legal advice @crossbrowser', async ({ page }) => {
    if (!process.env.SERVICE_AUTH_TOKEN?.trim() || !process.env.BEARER_TOKEN?.trim()) {
      console.log('generating tokens on sauce.....');
      await getS2SToken();
      await getAccessToken();
    }

    initializeExecutor(page);

    process.env.NOTICE_SERVED = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'NO';
    process.env.RENT_NON_RENT = 'YES';
    await performAction('navigateToUrl', home_url);

    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
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
