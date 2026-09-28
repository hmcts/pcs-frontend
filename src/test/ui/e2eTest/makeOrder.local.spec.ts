import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { initializeExecutor, performAction } from '../utils/controller';

const homeUrl = process.env.TEST_URL ?? 'http://localhost:3209/';

async function loginJudgeIfLocalIdamIsVisible(page: Page): Promise<void> {
  const idamSimulatorUsername = page.getByRole('textbox', { name: 'Enter Username' });
  if (await idamSimulatorUsername.isVisible()) {
    await idamSimulatorUsername.fill('judge@pcs.com');
    await page.getByRole('textbox', { name: 'Enter Password' }).fill(process.env.IDAM_PCS_USER_PASSWORD ?? 'password');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
}

test.describe('Make an order with local PCS services', () => {
  test.skip(process.env.E2E_LOCAL_PCS !== 'true', 'This journey requires pcs:bootWithCCD and the local IDAM simulator');

  test('starts, saves, reloads and submits a Docweave order', async ({ page }) => {
    initializeExecutor(page);
    process.env.NOTICE_SERVED = 'YES';
    process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
    process.env.GROUNDS = 'RENT_ARREARS_GROUND10';

    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
    await performAction('updatePaymentAPI');

    const caseNumber = process.env.CASE_NUMBER;
    expect(caseNumber).toBeTruthy();

    await page.goto(homeUrl);
    await loginJudgeIfLocalIdamIsVisible(page);

    const makeOrderUrl = `${homeUrl.replace(/\/$/, '')}/case/${caseNumber}/make-order`;
    await page.goto(makeOrderUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Make an order' })).toBeVisible();
    await expect(page.locator('#order-editor .docweave-editor__surface')).toBeVisible();
    await expect(page.locator('#order-editor .ProseMirror')).toContainText('IT IS ORDERED THAT:');
    await expect(page.locator('#order-document')).toHaveValue(/docweave-document/);

    await page.locator('[data-order-type="FREE_FORM"]').click();
    await page.locator('#free-form-text').fill('The claim is stayed.\n\nLiberty to apply.');
    await expect(page.locator('#order-editor .ProseMirror')).toContainText('The claim is stayed.');
    await expect(page.locator('#order-editor .ProseMirror')).toContainText('Liberty to apply.');
    await expect(page.locator('#order-document')).toHaveValue(/The claim is stayed/);

    await page.getByRole('button', { name: 'Save as draft' }).click();
    await expect(page).toHaveURL(new RegExp(`/cases/case-details/PCS/PCS/${caseNumber}`));
    // Manage Case sends the judge on to sign in, so reopen the draft in a new tab of the same session.
    const reopened = await page.context().newPage();
    await reopened.goto(makeOrderUrl, { waitUntil: 'domcontentloaded' });
    await expect(reopened.getByRole('heading', { name: 'Make an order' })).toBeVisible();
    await expect(reopened.getByRole('tab', { name: 'Free form' })).toHaveAttribute('aria-selected', 'true');
    await expect(reopened.locator('#free-form-text')).toHaveValue('The claim is stayed.\n\nLiberty to apply.');
    await expect(reopened.locator('#order-editor .ProseMirror')).toContainText('Liberty to apply.');

    await reopened.getByRole('button', { name: 'Send order to caseworker for review' }).click();
    await expect(reopened).toHaveURL(new RegExp(`/cases/case-details/PCS/PCS/${caseNumber}`));
  });
});
