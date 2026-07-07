import { expect } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { statementOfTruth } from '../data/page-data';
import { user } from '../data/user-data';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Statement of Truth - Citizen - functional test @nightly', async () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    process.env.NOTICE_SERVED = 'YES';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
    await performAction('fetchPINsAPI');
    await performAction('createUser', 'citizen', ['citizen']);
    await performAction('navigateToUrl', home_url);
    await performAction('login');
    await performAction('navigateToUrl', home_url + `/access-your-case`);
    await performAction('accessYourCase', {
      caseNumber: process.env.CASE_NUMBER,
      defendantDetailsKnown: true,
    });
    // Direct navigation with ?nav=1 to bypass access guard
    await performAction(
      'navigateToUrl',
      `${home_url}/case/${process.env.CASE_NUMBER}/respond-to-claim/end-of-journey-cya?nav=1`
    );
  });

  test('Citizen Statement of Truth validation and submission', async ({ page }) => {
    // 1. Validate empty submission errors
    await page.click('button[type="submit"]');

    await expect(page.locator('#statementOfTruthContempt-error')).toContainText(
      statementOfTruth.errors.contemptRequired
    );
    await expect(page.locator('#statementOfTruthBelief-error')).toContainText(statementOfTruth.errors.beliefRequired);
    await expect(page.locator('#fullName-error')).toContainText(statementOfTruth.errors.fullNameRequired);

    // 2. Validate max length limit on name
    await page.fill('#fullName', 'a'.repeat(101));
    await page.click('button[type="submit"]');

    await expect(page.locator('#fullName-error')).toContainText(statementOfTruth.errors.fullNameTooLong);

    // 3. Enter valid details and submit
    await page.check('#statementOfTruthContempt');
    await page.check('#statementOfTruthBelief');
    await page.fill('#fullName', 'John Citizen');
    await page.click('button[type="submit"]');

    // Verify redirection to final-submit page
    await expect(page).toHaveURL(new RegExp(`/case/${process.env.CASE_NUMBER}/final-submit`));
  });
});

test.describe('Statement of Truth - Legal Representative - functional test @nightly', async () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    process.env.NOTICE_SERVED = 'YES';
    process.env.CLAIMANT_NAME = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
    await performAction('getCaseAPI');
    await performAction('navigateToUrl', home_url);
    await performAction('login', user.defendantSolicitor.email);
    // Direct navigation is allowed for legal reps
    await performAction(
      'navigateToUrl',
      `${home_url}/case/${process.env.CASE_NUMBER}/respond-to-claim/end-of-journey-cya`
    );
  });

  test('Legal Rep Statement of Truth validation and submission', async ({ page }) => {
    // 1. Validate empty submission errors
    await page.click('button[type="submit"]');

    // Contempt checkbox is NOT rendered for legal rep, so only belief checkbox, name, firm, and position are validated
    await expect(page.locator('#statementOfTruthContempt-error')).toBeHidden();
    await expect(page.locator('#statementOfTruthBelief-error')).toContainText(
      statementOfTruth.errors.legalRepBeliefRequired
    );
    await expect(page.locator('#fullName-error')).toContainText(statementOfTruth.errors.fullNameRequired);
    await expect(page.locator('#nameOfFirm-error')).toContainText(statementOfTruth.errors.nameOfFirmRequired);
    await expect(page.locator('#positionHeld-error')).toContainText(statementOfTruth.errors.positionHeldRequired);

    // 2. Validate max length limit on text fields
    await page.fill('#fullName', 'a'.repeat(101));
    await page.fill('#nameOfFirm', 'b'.repeat(101));
    await page.fill('#positionHeld', 'c'.repeat(101));
    await page.click('button[type="submit"]');

    await expect(page.locator('#fullName-error')).toContainText(statementOfTruth.errors.fullNameTooLong);
    await expect(page.locator('#nameOfFirm-error')).toContainText(statementOfTruth.errors.nameOfFirmTooLong);
    await expect(page.locator('#positionHeld-error')).toContainText(statementOfTruth.errors.positionHeldTooLong);

    // 3. Enter valid details and submit
    await page.check('#statementOfTruthBelief');
    await page.fill('#fullName', 'Jane Solicitor');
    await page.fill('#nameOfFirm', 'Legal Partners');
    await page.fill('#positionHeld', 'Partner');
    await page.click('button[type="submit"]');

    // Verify redirection to final-submit page
    await expect(page).toHaveURL(new RegExp(`/case/${process.env.CASE_NUMBER}/final-submit`));
  });
});
