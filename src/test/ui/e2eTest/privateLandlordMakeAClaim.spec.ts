import { expect, test } from '@playwright/test';

import {
  ENGLISH_PROPERTY,
  GROUND_1A_AND_14,
  WELSH_PROPERTY,
  answer,
  becomeEligible,
  completeAboutYou,
  completeCircumstances,
  completeDefendants,
  completeOtherInformation,
  completeRentArrearsWithLedger,
  completeRentArrearsWithTable,
  completeTenancyGroundsAndNotice,
  continueOn,
  createLandlord,
  declineClaimFeeCard,
  enterAddress,
  isMakeAClaimEnabled,
  openTask,
  payClaimFee,
  startAsPrivateLandlord,
  submitClaim,
} from '../utils/common/privateLandlordClaim.journey';
import { finaliseAllValidations, initializeExecutor } from '../utils/controller';

const startUrl = `${process.env.TEST_URL}/make-a-claim`;

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Private landlord makes a possession claim @privateLandlord', () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    test.skip(!(await isMakeAClaimEnabled()), 'private-landlord-make-a-claim-enabled is off');
  });

  test('Rent arrears claim with the rent statement entered as a ledger', async ({ page }) => {
    await createLandlord('ledger');
    await becomeEligible(page, startUrl);
    await continueOn(page);
    await completeAboutYou(page);
    await completeDefendants(page);
    await completeTenancyGroundsAndNotice(page, GROUND_1A_AND_14);
    await completeRentArrearsWithLedger(page);
    await completeCircumstances(page);
    await completeOtherInformation(page);
    await submitClaim(page);
    await payClaimFee(page);
  });

  test('Rent arrears claim with the rent statement created as a table', async ({ page }) => {
    await createLandlord('table');
    await becomeEligible(page, startUrl);
    await continueOn(page);
    await completeAboutYou(page);
    await completeDefendants(page);
    await completeTenancyGroundsAndNotice(page);
    await completeRentArrearsWithTable(page);
    await completeCircumstances(page);
    await completeOtherInformation(page);
    await submitClaim(page);
    await payClaimFee(page);
  });
});

test.describe('Private landlord claim fee card declined @privateLandlord', () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    test.skip(!(await isMakeAClaimEnabled()), 'private-landlord-make-a-claim-enabled is off');
  });

  test('A declined card returns to the claim fee page to try again', async ({ page }) => {
    await createLandlord('ledger');
    await becomeEligible(page, startUrl);
    await continueOn(page);
    await completeAboutYou(page);
    await completeDefendants(page);
    await completeTenancyGroundsAndNotice(page);
    await completeRentArrearsWithLedger(page);
    await completeCircumstances(page);
    await completeOtherInformation(page);
    await submitClaim(page);
    await declineClaimFeeCard(page);
  });
});

test.describe('Private landlord cannot use the service @privateLandlord', () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    test.skip(!(await isMakeAClaimEnabled()), 'private-landlord-make-a-claim-enabled is off');
  });

  test('A mortgage provider is sent to MyHMCTS', async ({ page }) => {
    await page.goto(startUrl);
    await page.getByRole('button', { name: 'Start now' }).click();
    await page.getByRole('radio', { name: 'Mortgage provider', exact: true }).check();
    await continueOn(page);
    await expect(page.getByRole('heading', { level: 1, name: 'You cannot use this service' })).toBeVisible();
    await expect(page.getByText('Only private landlords can use this service.')).toBeVisible();
  });

  test('A claim against trespassers is sent to the paper forms', async ({ page }) => {
    await createLandlord();
    await startAsPrivateLandlord(page, startUrl);
    await page.getByRole('radio', { name: /^Yes – my claim is against a trespasser/ }).check();
    await continueOn(page);
    await expect(page.getByRole('heading', { level: 1, name: 'You cannot use this service yet' })).toBeVisible();
  });

  test('A solicitor is sent to MyHMCTS', async ({ page }) => {
    await createLandlord();
    await startAsPrivateLandlord(page, startUrl);
    await page.getByRole('radio', { name: /^No – my claim is against a tenant/ }).check();
    await continueOn(page);
    await enterAddress(page, 'property', ENGLISH_PROPERTY);
    await continueOn(page);
    await page.getByRole('radio', { name: 'A client – I’m their solicitor', exact: true }).check();
    await continueOn(page);
    await expect(page.getByText('Only people making a claim for themselves can use this service.')).toBeVisible();
  });

  test('A property outside England cannot be claimed', async ({ page }) => {
    await createLandlord();
    await becomeEligible(page, startUrl, WELSH_PROPERTY);
    await expect(page).toHaveURL(/\/make-a-claim\/property-ineligible$/);
    await expect(page.getByText('You can only make a possession claim against a property in England')).toBeVisible();
  });

  test('A claim with more than one claimant cannot be made yet', async ({ page }) => {
    await createLandlord();
    await becomeEligible(page, startUrl);
    await continueOn(page);
    await openTask(page, 'About you and your contact preferences');
    await continueOn(page);
    await answer(page, 'A registered company or organisation');
    await page.getByLabel('Registered company or organisation name').fill('Wright Lettings Ltd');
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await enterAddress(page, 'claimant', { line1: '12 High Street', town: 'London', postcode: 'NW1 1AA' });
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await answer(page, 'Yes');
    await answer(page, 'No');
    await answer(page, 'Yes');
    await expect(page.getByText('You cannot make a claim with other claimants using this service yet.')).toBeVisible();
  });
});

test.describe('Private landlord journey switched off @privateLandlord', () => {
  test('Every page of the journey is not found', async ({ page }) => {
    test.skip(await isMakeAClaimEnabled(), 'private-landlord-make-a-claim-enabled is on in this environment');
    for (const path of [
      '/make-a-claim',
      '/make-a-claim/claimant-type',
      '/case/1777027600017761/make-a-claim/task-list',
    ]) {
      const response = await page.goto(`${process.env.TEST_URL}${path}`);
      expect(response?.status(), path).toBe(404);
    }
  });
});
