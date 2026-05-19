import { citizenCreateGenAppApiData, createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmIfTheseDocumentsRelateToAnApplication,
  startEvidenceUpload,
  uploadYourDocuments,
} from '../data/page-data/documents-page-data';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'NO';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  logTestEnvAfterBeforeEach(testInfo.title, DASHBOARD_BEFORE_EACH_ENV_KEYS);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction(
    'navigateToUrl',
    home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
  );
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Documents - e2e Journey @nightly', async () => {
  test('Upload documents when GenApps submitted @smoke @regression @crossbrowser', async () => {
    await performAction('citizenCreateGenAppAPI', { data: citizenCreateGenAppApiData.citizenCreateGenAppPayload });
    await performAction('clickButton', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', confirmIfTheseDocumentsRelateToAnApplication.mainHeader);
  });

  test('Upload documents when GenApps not submitted @regression', async () => {
    await performAction('clickButton', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);
  });
});
