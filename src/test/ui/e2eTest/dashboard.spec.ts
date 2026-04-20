import { test } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { dashboard } from '../data/page-data';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { initializeExecutor, performAction, performActions, performValidation } from '../utils/controller';

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
  await performAction('navigateToUrl', home_url + `/dashboard/${process.env.CASE_NUMBER}`);
});

test.describe('Dashboard - e2e Journey @nightly', async () => {
  test('Validate address, case number and links on the dashboard @regression', async () => {
    await performValidation('mainHeader', dashboard.mainHeader);
    await performValidation('text', { elementType: 'paragraph', text: dashboard.caseNumberParagraph() });
    await performValidation('text', { elementType: 'subHeader', text: dashboard.helpAndSupportHeader });
    await performActions(
      'Validate Help and Support links',
      ['clickLinkAndVerifySameTabTitle', dashboard.helpWithFeesLink, dashboard.getHelpPayingCourtFeesHeader],
      ['clickLinkAndVerifySameTabTitle', dashboard.findOutAboutMediationLink, dashboard.aGuideToCivilMediationHeader],
      ['clickLinkAndVerifySameTabTitle', dashboard.whatToExpectAtHearingLink, dashboard.whatToExpectComingCourtHeader],
      ['clickLinkAndVerifySameTabTitle', dashboard.representMyselfAtHearingLink, dashboard.representYourselfHeader],
      ['clickLinkAndVerifySameTabTitle', dashboard.findLegalAdviceLink, dashboard.findLegalAdviceHeader],
      ['clickLinkAndVerifySameTabTitle', dashboard.findInfoAboutMyCourtLink, dashboard.findACourtOrTribunalHeader]
    );
  });
});
