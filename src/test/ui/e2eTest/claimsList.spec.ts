import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { claims, taskList } from '../data/page-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
  process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
  process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Claims list - e2e Journey @nightly', async () => {
  test('Claims list - View claim @noDefendants @regression @crossbrowser', async () => {
    await performValidation('elementToBeVisible', claims.noClaimsAgainstYouDynamicParagraph);
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
    console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
    await performAction('fetchPINsAPI');
    await performAction('validateAccessCodeAPI');
    await performAction('reloadPage');
    await performValidation('elementToBeVisible', process.env.CASE_NUMBER);
    await performAction('clickLink', claims.viewClaimDynamicLink);
    await performValidation('elementToBeVisible', taskList.mainHeader);
  });
});
