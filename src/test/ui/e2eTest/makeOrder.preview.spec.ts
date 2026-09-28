import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { initializeExecutor, performAction } from '../utils/controller';

const homeUrl = (process.env.TEST_URL ?? '').replace(/\/$/, '');

/** Signs the judge in if IDAM asks, as it does the first time the journey is opened in a session. */
async function signInIfAsked(page: Page): Promise<void> {
  const email = page.getByRole('textbox', { name: 'Email address' });
  const heading = page.getByRole('heading', { name: 'Make an order' });
  await expect(email.or(heading)).toBeVisible({ timeout: 30_000 });
  if (await email.isVisible()) {
    await performAction('login', process.env.E2E_JUDGE_EMAIL);
  }
}

/** A claim issued in the pcs-api preview, ready for a judge to make an order on. */
async function createIssuedCase(): Promise<void> {
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  await performAction('updatePaymentAPI');
}

/** The case in the XUI that pcs-frontend hands the judge back to. */
function xuiCaseUrl(caseNumber: string): string {
  return `${process.env.XUI_BASE_URI}/cases/case-details/PCS/PCS/${caseNumber}`;
}

/** XUI signs staff and judges in in two steps: email, then password. */
async function signInToXuiIfAsked(page: Page): Promise<void> {
  const email = page.getByRole('textbox', { name: 'Enter your email address' });
  const tabs = page.getByRole('tab', { name: 'History' });
  await expect(email.or(tabs)).toBeVisible({ timeout: 60_000 });
  if (await email.isVisible()) {
    await email.fill(process.env.E2E_JUDGE_EMAIL as string);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Enter your password', { exact: true }).fill(process.env.IDAM_PCS_USER_PASSWORD as string);
    await page.getByRole('button', { name: /Sign in|Continue/ }).click();
    await expect(tabs).toBeVisible({ timeout: 60_000 });
  }
}

async function openMakeOrder(page: Page, caseNumber: string): Promise<void> {
  await page.goto(`${homeUrl}/case/${caseNumber}/make-order`, { waitUntil: 'networkidle' });
  await signInIfAsked(page);
  await expect(page.getByRole('heading', { name: 'Make an order' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#order-editor .docweave-editor__surface')).toBeVisible();
}

test.describe('Make an order in a preview environment', () => {
  test.skip(process.env.E2E_PREVIEW_PCS !== 'true', 'Runs against a pcs-frontend preview wired to a pcs-api preview');

  test('a caseworker, whom CCD does not let make an order, is shown it does not exist', async ({ page }) => {
    initializeExecutor(page);
    await createIssuedCase();
    const caseNumber = process.env.CASE_NUMBER as string;

    await page.goto(`${homeUrl}/case/${caseNumber}/make-order`, { waitUntil: 'networkidle' });
    const email = page.getByRole('textbox', { name: 'Email address' });
    await expect(email).toBeVisible({ timeout: 30_000 });
    await performAction('login', process.env.E2E_CASEWORKER_EMAIL ?? 'pcs-caseworker@test.com');

    await expect(page.getByText('Not Found')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Make an order' })).toHaveCount(0);
  });

  test('a judge drafts, changes, reopens and submits an order for review', async ({ page }) => {
    initializeExecutor(page);
    await createIssuedCase();
    const caseNumber = process.env.CASE_NUMBER as string;
    expect(caseNumber).toBeTruthy();
    test.info().annotations.push({ type: 'case', description: caseNumber });
    const caseDetails = new RegExp(`/cases/case-details/PCS/PCS/${caseNumber}`);

    await openMakeOrder(page, caseNumber);
    await expect(page.getByText('Claimant 1: John Doe', { exact: true })).toBeVisible();
    await expect(page.locator('#order-editor .ProseMirror')).toContainText('IT IS ORDERED THAT:');

    // A first draft, in free-form wording.
    await page.locator('[data-order-type="FREE_FORM"]').click();
    await page.locator('#free-form-text').fill('The claim is stayed.\n\nLiberty to apply.');
    await expect(page.locator('#order-editor .ProseMirror')).toContainText('Liberty to apply.');
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await expect(page).toHaveURL(caseDetails);

    // The judge's working draft comes back as they left it.
    const second = await page.context().newPage();
    initializeExecutor(second);
    await openMakeOrder(second, caseNumber);
    await expect(second.getByRole('tab', { name: 'Free form' })).toHaveAttribute('aria-selected', 'true');
    await expect(second.locator('#free-form-text')).toHaveValue('The claim is stayed.\n\nLiberty to apply.');

    // A later save of the same draft replaces the wording.
    await second.locator('#free-form-text').fill('The claim is adjourned generally.');
    await second.getByRole('button', { name: 'Save as draft' }).click();
    await expect(second).toHaveURL(caseDetails);

    const third = await page.context().newPage();
    initializeExecutor(third);
    await openMakeOrder(third, caseNumber);
    await expect(third.locator('#free-form-text')).toHaveValue('The claim is adjourned generally.');

    // Submitting for review closes the draft; the judge's next visit starts a new one.
    await third.getByRole('button', { name: 'Send order to caseworker for review' }).click();
    await expect(third).toHaveURL(caseDetails);

    const fourth = await page.context().newPage();
    initializeExecutor(fourth);
    await openMakeOrder(fourth, caseNumber);
    await expect(fourth.locator('#free-form-text')).not.toHaveValue('The claim is adjourned generally.');

    // In XUI, the case history shows each change the judge made through the event.
    const xui = await page.context().newPage();
    await xui.goto(xuiCaseUrl(caseNumber));
    await signInToXuiIfAsked(xui);
    await xui.getByRole('tab', { name: 'History' }).click();
    // Opening make order without a draft starts one, so: start, save, save, submit for review, start.
    await expect(xui.getByRole('link', { name: 'Make an order' })).toHaveCount(5, { timeout: 30_000 });

    // And XUI hands the judge to pcs-frontend when they choose the event.
    await xui.getByRole('tab', { name: 'Summary' }).click();
    await xui.locator('#next-step').selectOption({ label: 'Make an order' });
    await xui.getByRole('button', { name: 'Go' }).click();
    await expect(xui.getByRole('heading', { name: 'Make an order' })).toBeVisible({ timeout: 30_000 });
  });
});
