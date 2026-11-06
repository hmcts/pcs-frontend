import { randomUUID } from 'crypto';

import { type Page, expect } from '@playwright/test';

import { LaunchDarklyAction } from '../actions/custom-actions/launchDarkly.action';
import { performAction } from '../controller';

export type RentHistoryDesign = 'ledger' | 'table';

export const MAKE_A_CLAIM_FLAG = 'private-landlord-make-a-claim-enabled';

/** Postcodes pcs-api maps to a court (V026__pilot_postcodes.sql): Bradford in England, Betws-y-Coed in Wales. */
export const ENGLISH_PROPERTY = { line1: '1 Test Street', town: 'Bradford', postcode: 'BD10 0JB' };
export const WELSH_PROPERTY = { line1: '1 Test Street', town: 'Betws-y-Coed', postcode: 'LL24 0BE' };

/** Whether the private landlord journey is switched on for the environment under test. */
export async function isMakeAClaimEnabled(): Promise<boolean> {
  return new LaunchDarklyAction().getFlagValue(MAKE_A_CLAIM_FLAG);
}

/**
 * Creates a citizen whose email picks the rent history design: the Test environment's LaunchDarkly rule serves
 * "table" to emails containing pl-table- and "ledger" to everyone else.
 */
export async function createLandlord(design: RentHistoryDesign = 'ledger'): Promise<void> {
  await performAction('createUser', `pl-${design}-${randomUUID()}`, ['citizen']);
}

export async function saveAndContinue(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
}

export async function continueOn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function answer(page: Page, option: string): Promise<void> {
  await page.getByRole('radio', { name: option, exact: true }).check();
  await saveAndContinue(page);
}

export async function fillDate(page: Page, name: string, day: string, month: string, year: string): Promise<void> {
  await page.locator(`[id="${name}-day"]`).fill(day);
  await page.locator(`[id="${name}-month"]`).fill(month);
  await page.locator(`[id="${name}-year"]`).fill(year);
}

/** Types an address in through "Enter the address manually", which every address question has. */
export async function enterAddress(
  page: Page,
  prefix: string,
  address: { line1: string; town: string; postcode: string }
): Promise<void> {
  const manual = page.locator(`[id="${prefix}-enterManuallyDetails"]`);
  if (!(await manual.evaluate(details => (details as HTMLDetailsElement).open))) {
    await manual.locator('summary').click();
  }
  await page.locator(`[id="${prefix}-addressLine1"]`).fill(address.line1);
  await page.locator(`[id="${prefix}-town"]`).fill(address.town);
  await page.locator(`[id="${prefix}-postcode"]`).fill(address.postcode);
}

export async function openTask(page: Page, task: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 2, name: '1. Before you start' })).toBeVisible();
  await page.getByRole('link', { name: task, exact: true }).click();
}

export async function expectTaskStatus(page: Page, task: string, status: string): Promise<void> {
  const item = page.locator('.govuk-task-list__item').filter({ hasText: task });
  await expect(item.locator('.govuk-task-list__status')).toHaveText(status);
}

/** From the public start page to signing in, the journey every claimant begins with. */
export async function startAsPrivateLandlord(page: Page, startUrl: string): Promise<void> {
  await page.goto(startUrl);
  await expect(page.getByRole('heading', { level: 1, name: 'Make a property possession claim online' })).toBeVisible();
  await page.getByRole('button', { name: 'Start now' }).click();
  await page.getByRole('radio', { name: 'Private landlord', exact: true }).check();
  await continueOn(page);
  await performAction('login');
}

/** Answers the questions asked before the claim exists, ending on "You're eligible" for a new claim. */
export async function becomeEligible(page: Page, startUrl: string, property = ENGLISH_PROPERTY): Promise<void> {
  await startAsPrivateLandlord(page, startUrl);
  await page.getByRole('radio', { name: /^No – my claim is against a tenant/ }).check();
  await continueOn(page);
  await enterAddress(page, 'property', property);
  await continueOn(page);
  await page.getByRole('radio', { name: 'Myself – I’m the claimant', exact: true }).check();
  await continueOn(page);
}

export async function completeAboutYou(page: Page): Promise<void> {
  await openTask(page, 'About you and your contact preferences');
  await continueOn(page);
  await answer(page, 'An individual');
  await page.getByLabel('First name').fill('Billy');
  await page.getByLabel('Last name').fill('Wright');
  await saveAndContinue(page);
  await enterAddress(page, 'claimant', { line1: '12 High Street', town: 'London', postcode: 'NW1 1AA' });
  await saveAndContinue(page);
  await answer(page, 'Yes');
  await answer(page, 'No');
  await answer(page, 'No');
  await expect(page.getByRole('heading', { level: 1, name: 'Check your answers' })).toBeVisible();
  await saveAndContinue(page);
  await expectTaskStatus(page, 'About you and your contact preferences', 'Done');
}

export async function completeDefendants(page: Page): Promise<void> {
  await openTask(page, 'About the defendants');
  await continueOn(page);
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByLabel('First name').fill('Brian');
  await page.getByLabel('Last name').fill('Springford');
  await saveAndContinue(page);
  await answer(page, 'Yes');
  await answer(page, 'No');
  await saveAndContinue(page);
  await expectTaskStatus(page, 'About the defendants', 'Done');
}

/** Other grounds to claim on as well as rent arrears, each with the reason the claimant gives for it. */
export type OtherGroundReasons = { ground: RegExp; heading: string; reason: string }[];

export const GROUND_1A_AND_14: OtherGroundReasons = [
  { ground: /\(Ground 1A\)$/, heading: 'Sale of dwelling house (Ground 1A)', reason: 'I am selling the property' },
  {
    ground: /^Antisocial behaviour \(Ground 14\)$/,
    heading: 'Antisocial behaviour (Ground 14)',
    reason: 'Noise complaints',
  },
];

export async function completeTenancyGroundsAndNotice(
  page: Page,
  otherGrounds: OtherGroundReasons = []
): Promise<void> {
  await openTask(page, 'About the tenancy, your grounds and notice served');
  await continueOn(page);
  await answer(page, 'Assured or assured periodic tenancy');
  await fillDate(page, 'tenancyStartDate', '15', '1', '2018');
  await saveAndContinue(page);
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  await page
    .getByLabel('Explain why you cannot upload a copy of the tenancy or licence agreement')
    .fill('The agreement was verbal');
  await saveAndContinue(page);
  await answer(page, 'Yes');
  await page.getByRole('checkbox', { name: /\(Ground 8\)$/ }).check();
  await saveAndContinue(page);
  if (otherGrounds.length > 0) {
    await answer(page, 'Yes');
    for (const { ground } of otherGrounds) {
      await page.getByRole('checkbox', { name: ground }).check();
    }
    await saveAndContinue(page);
    for (const { heading, reason } of otherGrounds) {
      await page.getByLabel(`Why are you making a claim for possession under ${heading}?`).fill(reason);
      await saveAndContinue(page);
    }
  } else {
    await answer(page, 'No');
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Check your answers' })).toBeVisible();
  await saveAndContinue(page);

  await continueOn(page);
  await answer(page, 'Yes');
  await answer(page, 'Notice seeking possession');
  await fillDate(page, 'noticeDate', '9', '6', '2026');
  await saveAndContinue(page);
  await page.getByRole('checkbox', { name: 'By personally handing it to or leaving it with someone' }).check();
  await page.getByLabel('Who was the notice left with?').fill('Brian Springford');
  await fillDate(page, 'noticeMethods.handedDate', '9', '6', '2026');
  await saveAndContinue(page);
  await answer(page, 'Yes');
  await performAction('uploadFile', 'NoticeServiceJurisdiction.docx');
  await saveAndContinue(page);
  await saveAndContinue(page);
  await expectTaskStatus(page, 'About the tenancy, your grounds and notice served', 'Done');
}

async function startRentArrears(page: Page): Promise<void> {
  await openTask(page, 'Proof of rent arrears');
  await continueOn(page);
  await page.getByLabel('How much is the rent?').fill('1000');
  await saveAndContinue(page);
  await answer(page, 'Monthly');
}

async function finishRentArrears(page: Page): Promise<void> {
  await answer(page, 'Yes');
  await saveAndContinue(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Check your answers' })).toBeVisible();
  await saveAndContinue(page);
  await expectTaskStatus(page, 'Proof of rent arrears', 'Done');
}

async function enterArrearsAmounts(page: Page): Promise<void> {
  await page.getByLabel('What were the rent arrears on the date you served the notice?').fill('3000');
  await saveAndContinue(page);
  await page.getByLabel('What are the rent arrears on today’s date?').fill('2880');
  await saveAndContinue(page);
}

/** Concept 1: the claimant adds the rent statement's transactions one at a time. */
export async function completeRentArrearsWithLedger(page: Page): Promise<void> {
  await startRentArrears(page);
  await enterArrearsAmounts(page);
  await expect(page.getByRole('radio', { name: 'Create a rent statement from the rent due each period' })).toHaveCount(
    0
  );
  await answer(page, 'Enter the rent statement transactions one at a time');

  await fillDate(page, 'transactionDate', '1', '6', '2026');
  await page.getByRole('checkbox', { name: 'Rent charge' }).check();
  await page.getByLabel('Amount charged').fill('1000');
  await page.getByLabel('Description or reference (optional)').fill('June rent');
  await saveAndContinue(page);
  await answer(page, 'Yes');

  await fillDate(page, 'transactionDate', '3', '6', '2026');
  await page.getByRole('checkbox', { name: 'Tenant payment' }).check();
  await page.getByLabel('Amount paid').fill('120');
  await saveAndContinue(page);

  await expect(page.getByText('Total arrears: £880.00')).toBeVisible();
  await answer(page, 'No');
  await finishRentArrears(page);
}

/** Concept 2: the service lays out the rent due each period and the claimant adds the payments made. */
export async function completeRentArrearsWithTable(page: Page): Promise<void> {
  await startRentArrears(page);
  await page.getByLabel('Which day of the month is rent due?').fill('1');
  await saveAndContinue(page);
  await enterArrearsAmounts(page);
  await expect(page.getByRole('radio', { name: 'Enter the rent statement transactions one at a time' })).toHaveCount(0);
  await answer(page, 'Create a rent statement from the rent due each period');

  await fillDate(page, 'statementStart', '1', '6', '2026');
  await fillDate(page, 'statementEnd', '31', '8', '2026');
  await saveAndContinue(page);
  await expect(page.locator('table tbody tr')).toHaveCount(3);
  await expect(page.getByText('Total arrears: £3,000.00')).toBeVisible();

  await page.getByRole('link', { name: 'Add a payment payment for rent due on 1 June 2026' }).click();
  await fillDate(page, 'datePaid', '5', '6', '2026');
  await page.getByLabel('Amount paid').fill('120');
  await saveAndContinue(page);
  await expect(page.getByText('Total arrears: £2,880.00')).toBeVisible();
  await saveAndContinue(page);
  await finishRentArrears(page);
}

export async function completeCircumstances(page: Page): Promise<void> {
  await openTask(page, 'Circumstances');
  await continueOn(page);
  await saveAndContinue(page);
  await saveAndContinue(page);
  await answer(page, 'No');
  await saveAndContinue(page);
  await expectTaskStatus(page, 'Circumstances', 'Done');
}

/** Other information runs straight on to checking the answers, as the prototype does. */
export async function completeOtherInformation(page: Page): Promise<void> {
  await openTask(page, 'Upload files and other information');
  await continueOn(page);
  await saveAndContinue(page);
  await answer(page, 'No');
  await answer(page, 'No');
  await continueOn(page);
  await continueOn(page);
  await answer(page, 'English');
}

/** Signs the statement of truth and submits, ending on the claim fee page. */
export async function submitClaim(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Check your answers before submitting your claim' })
  ).toBeVisible();
  await expect(page.getByText('Billy Wright')).toBeVisible();
  await page.getByRole('checkbox', { name: /^I understand that proceedings for contempt of court/ }).check();
  await page.getByRole('checkbox', { name: 'I believe that the facts stated in this claim form are true.' }).check();
  await page.getByLabel('Your full name').fill('Billy Wright');
  await page.getByRole('button', { name: 'Submit claim' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pay your claim fee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay your claim fee' })).toBeVisible();
}
