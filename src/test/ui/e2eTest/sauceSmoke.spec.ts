import assert from 'node:assert';

import { type Page, type TestInfo, expect, test } from '@playwright/test';
import config from 'config';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';
import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  confirmationOfNoticeGiven,
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  dateOfBirth,
  defendantNameCapture,
  freeLegalAdvice,
  startNow,
  tenancyTypeDetails,
} from '../data/page-data';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';
import { resolveIdamPassword } from '../utils/idamPassword';

const PCS_AAT_URL = 'https://pcs.aat.platform.hmcts.net/';
const MANAGE_CASE_URL = 'https://manage-case.aat.platform.hmcts.net';
const homeUrl = config.get('e2e.testUrl') as string;

async function attachFullPagePng(testInfo: TestInfo, page: Page, filename: string) {
  await testInfo.attach(filename, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test.describe('Sauce smoke', () => {
  test('Manage case exui test', async ({ page }, testInfo) => {
    const email = process.env.IDAM_PCS_USER_EMAIL?.trim() || 'pcs-solicitor-automation@test.com';
    const password = resolveIdamPassword();
    test.skip(!password);
    await page.goto(MANAGE_CASE_URL, { waitUntil: 'domcontentloaded' });
    await attachFullPagePng(testInfo, page, 'mc-ui-01-sign-in.png');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: 'Create case' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-02-after-login.png');
    await page.getByRole('link', { name: 'Create case' }).click();
    await expect(page.getByLabel('Case type')).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-03-case-type.png');
    await page.getByLabel('Case type').selectOption('PCS');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-04-after-start.png');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('textbox', { name: 'Enter a UK postcode' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-05-postcode.png');
    await page.getByRole('textbox', { name: 'Enter a UK postcode' }).fill('w37rx');
    await page.getByRole('button', { name: 'Find address' }).click();
    await expect(page.getByLabel('Select an address')).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-06-address-list.png');
    await page.getByLabel('Select an address').selectOption('2: Object');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Save and continue' })).toBeVisible({ timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'mc-ui-07-before-save.png');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('load');
    await attachFullPagePng(testInfo, page, 'mc-ui-08-after-save.png');
  });

  /**
   * Fetches S2S + IDAM tokens in the test worker, then PCS createUser/login (uses BEARER_TOKEN).
   * Restores solicitor env before Manage Case UI — createUser overwrites IDAM_PCS_USER_EMAIL.
   */
  test('Manage case with token setup and PCS login ', async ({ page }, testInfo) => {
    await getS2SToken();
    await getAccessToken();

    initializeExecutor(page);
    await performAction('navigateToUrl', PCS_AAT_URL);
    await attachFullPagePng(testInfo, page, 'pcs-ui-01-after-navigate.png');
    await performAction('createUser', 'citizen', ['citizen']);
    await attachFullPagePng(testInfo, page, 'pcs-ui-02-after-create-user.png');
    await performAction('login');
    // Proof of PCS login: left Idam / sign-in URL and landed on PCS host.
    await expect(page).toHaveURL(/pcs\.aat\.platform\.hmcts\.net/i, { timeout: 90_000 });
    await attachFullPagePng(testInfo, page, 'pcs-ui-03-after-login.png');
  });

  /**
   * Same journey as `respondToAClaim.spec.ts` →
   * `test('Respond to a claim @noDefendants @regression @accessibility')`
   * (noDefendants beforeEach setup + body steps).
   */
  test('Respond to a claim (noDefendants) @pcssaucelab', async ({ page }, testInfo) => {
    await getS2SToken();
    await getAccessToken();

    const baseUrl = homeUrl.endsWith('/') ? homeUrl : `${homeUrl}/`;

    initializeExecutor(page);
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayload.claimantName;
    process.env.NOTICE_SERVED = 'YES';
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;

    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
    console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
    await performAction('fetchPINsAPI');
    await performAction('createUser', 'citizen', ['citizen']);
    await performAction('validateAccessCodeAPI');
    await performAction('navigateToUrl', baseUrl);
    await performAction('login');
    await performAction('navigateToUrl', `${baseUrl}case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
    await performAction('clickButton', startNow.startNowButton);
    await attachFullPagePng(testInfo, page, 'rtoc-ui-01-after-start-now.png');

    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: dateOfBirth.dayInputText,
      dobMonth: dateOfBirth.monthInputText,
      dobYear: dateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.yesRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiData.submitCasePayloadNoDefendants.isClaimantNameCorrect
    );
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiData.submitCasePayloadNoDefendants.tenancy_TypeOfTenancyLicence,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown', {
      tsDay: '15',
      tsMonth: '11',
      tsYear: '2024',
    });
    await performAction('selectNoticeDetails', {
      option: confirmationOfNoticeGiven.yesRadioOption,
    });
    await performAction('enterNoticeDateUnknown');

    finaliseAllValidations();
  });

  test('Service Token s2s - 200', async ({ request }) => {
    const res = await request.post(
      'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease',
      { headers: { 'Content-Type': 'application/json' }, data: { microservice: 'pcs_api' } }
    );
    assert.strictEqual(res.status(), 200);
  });
});
