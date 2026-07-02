import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { startNow } from '../data/page-data';
import { user } from '../data/user-data';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
  process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  await performAction('getCaseAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login', user.defendantSolicitor.email);
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim LR - e2e Journey @nightly', async () => {
  test('Respond to claim - LR  @noDefendants @smoke @regression @PR', async () => {});
});
