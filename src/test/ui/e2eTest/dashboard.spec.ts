import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { dashboard } from '../data/page-data';
import { initializeExecutor, performAction, performActions, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
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
