import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { dashboard } from '../data/page-data';
import { contactUs } from '../data/section-data/contactUs.section.data';
import { initializeExecutor, performAction, performValidation, performValidations } from '../utils/controller';

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
  test('Validate address on the dashboard is same as property address @regression', async () => {
    await performValidation('mainHeader', dashboard.mainHeader);
    await performValidation('text', { elementType: 'paragraph', text: dashboard.caseNumberParagraph() });
    await performAction('clickLink', contactUs.contactUsForHelpParagraph);
    await performValidations(
      'Validate contact us section',
      ['text', { elementType: 'subSectionHeader', text: contactUs.emailSubHeader }],
      ['text', { elementType: 'paragraphLink', text: contactUs.localCourtEmailAddrParagraph }],
      ['text', { elementType: 'link', text: contactUs.findACourtLink }],
      ['text', { elementType: 'paragraph', text: contactUs.ifYouDoNotKnowParagraph }],
      ['text', { elementType: 'subSectionHeader', text: contactUs.telephoneSubHeader }],
      ['text', { elementType: 'paragraph', text: contactUs.telephoneNumberParagraph }],
      ['text', { elementType: 'paragraph', text: contactUs.telephoneAvailabilityParagraph }],
      ['text', { elementType: 'link', text: contactUs.callChargesLink }]
    );
  });
});
