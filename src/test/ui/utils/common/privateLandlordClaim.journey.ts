import { randomUUID } from 'crypto';

import { type Page, expect } from '@playwright/test';

import { formatCaseReferenceForDisplay } from '../../../../main/utils/caseReference';
import { paymentDetails } from '../../data/page-data/paymentDetails.page.data';
import { LaunchDarklyAction } from '../actions/custom-actions/launchDarkly.action';
import { performAction, performValidation } from '../controller';

export const MAKE_A_CLAIM_FLAG = 'private-landlord-make-a-claim-enabled';

/** Postcodes pcs-api maps to a court (V026__pilot_postcodes.sql): Bradford in England, Betws-y-Coed in Wales. */
export const ENGLISH_PROPERTY = { line1: '1 Test Street', town: 'Bradford', postcode: 'BD10 0JB' };
export const WELSH_PROPERTY = { line1: '1 Test Street', town: 'Betws-y-Coed', postcode: 'LL24 0BE' };
/** Outside England and Wales, so never claimable however pcs-api maps it. */
export const SCOTTISH_PROPERTY = { line1: '1 Union Street', town: 'Aberdeen', postcode: 'AB10 1XG' };

/** Whether the private landlord journey is switched on for the environment under test. */
export async function isMakeAClaimEnabled(): Promise<boolean> {
  return new LaunchDarklyAction().getFlagValue(MAKE_A_CLAIM_FLAG);
}

export async function createLandlord(): Promise<void> {
  await performAction('createUser', `pl-${randomUUID()}`, ['citizen']);
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
  await expect(page.getByRole('heading', { level: 2, name: '1. Your claim' })).toBeVisible();
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

/** Answers the start questions up to the property, which is checked as soon as it is given. */
export async function giveProperty(page: Page, startUrl: string, property = ENGLISH_PROPERTY): Promise<void> {
  await startAsPrivateLandlord(page, startUrl);
  await page.getByRole('radio', { name: /^No – my claim is against a tenant/ }).check();
  await continueOn(page);
  await enterAddress(page, 'property', property);
  await continueOn(page);
}

/**
 * Answers the questions asked before the claim exists, ending on "You're eligible" for a new claim. A property in
 * Wales is asked the Wales claimant type first.
 */
export async function becomeEligible(page: Page, startUrl: string, property = ENGLISH_PROPERTY): Promise<void> {
  await giveProperty(page, startUrl, property);
  if (property === WELSH_PROPERTY) {
    await expect(page.getByRole('radio', { name: 'Registered community landlord', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Private landlord', exact: true }).check();
    await continueOn(page);
  }
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

export async function completeTenancyAndGrounds(page: Page, otherGrounds: OtherGroundReasons = []): Promise<void> {
  await openTask(page, 'About the tenancy and your grounds for possession');
  await continueOn(page);
  await answer(page, 'Assured or assured periodic tenancy');
  await fillDate(page, 'tenancyStartDate', '15', '1', '2018');
  await saveAndContinue(page);
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  await page
    .getByLabel('Why can you not upload a copy of the tenancy or licence agreement?')
    .fill('The agreement was verbal');
  await saveAndContinue(page);
  await completeGrounds(page, otherGrounds);
}

/** The tenancy task for a property in Wales, which asks about the occupation contract instead of the tenancy. */
export async function completeOccupationContractAndGrounds(page: Page): Promise<void> {
  await openTask(page, 'About the tenancy and your grounds for possession');
  await continueOn(page);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'What type of occupation contract or licence is in place, or was in place?',
    })
  ).toBeVisible();
  await answer(page, 'Standard contract');
  await fillDate(page, 'occupationContractStartDate', '27', '9', '2022');
  await saveAndContinue(page);
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  await page
    .getByLabel('Explain why you cannot upload a copy of the occupation contract or licence agreement')
    .fill('The contract was lost');
  await saveAndContinue(page);
  await completeGrounds(page);
}

async function completeGrounds(page: Page, otherGrounds: OtherGroundReasons = []): Promise<void> {
  await answer(page, 'Yes');
  await page.getByRole('checkbox', { name: /\(Ground 8\)$/ }).check();
  await saveAndContinue(page);
  if (otherGrounds.length > 0) {
    await answer(page, 'Yes');
    for (const { ground } of otherGrounds) {
      await page.getByRole('checkbox', { name: ground }).check();
    }
    await saveAndContinue(page);
    for (let asked = 0; asked < otherGrounds.length; asked++) {
      const question = (await page.locator('h1').innerText()).trim();
      const ground = otherGrounds.find(({ heading }) => question.includes(heading));
      expect(ground, `a reason for "${question}"`).toBeDefined();
      await page.getByLabel(question).fill(ground!.reason);
      await saveAndContinue(page);
    }
  } else {
    await answer(page, 'No');
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Check your answers' })).toBeVisible();
  await saveAndContinue(page);
  await expectTaskStatus(page, 'About the tenancy and your grounds for possession', 'Done');
}

/** The served date is asked only under the method the notice was served by. */
export async function completeNotice(page: Page): Promise<void> {
  await openTask(page, 'About the notice you served');
  await continueOn(page);
  await answer(page, 'Yes');
  await answer(page, 'Notice seeking possession');
  await page.getByRole('checkbox', { name: 'By personally handing it to or leaving it with someone' }).check();
  await page.getByLabel('Who was the notice left with?').fill('Brian Springford');
  await fillDate(page, 'noticeMethods.handedDate', '9', '6', '2026');
  await saveAndContinue(page);
  await answer(page, 'Yes');
  await performAction('uploadFile', 'NoticeServiceJurisdiction.docx');
  await saveAndContinue(page);
  await saveAndContinue(page);
  await expectTaskStatus(page, 'About the notice you served', 'Done');
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
  await page.getByLabel('How much were the rent arrears on the date you served notice?').fill('3000');
  await saveAndContinue(page);
  await page.getByLabel('How much are the rent arrears on today’s date?').fill('2880');
  await saveAndContinue(page);
}

/** The claimant uploads a rent statement of their own. */
export async function completeRentArrearsWithUpload(page: Page): Promise<void> {
  await startRentArrears(page);
  await enterArrearsAmounts(page);
  await answer(page, 'Upload a rent statement that follows the guidelines');
  await performAction('uploadFile', 'NoticeServiceJurisdiction.docx');
  await saveAndContinue(page);
  await finishRentArrears(page);
}

async function addPayment(page: Page, day: string, amount: string, addAnother: 'Yes' | 'No'): Promise<void> {
  await fillDate(page, 'datePaid', day, '6', '2026');
  await page.getByLabel('Amount paid').fill(amount);
  await page
    .getByRole('group', { name: 'Do you want to add another payment in this period?' })
    .getByRole('radio', { name: addAnother })
    .check();
  await saveAndContinue(page);
}

/** The service lays out the rent due each period and the claimant adds the payments made in each. */
export async function completeRentArrearsWithTable(page: Page): Promise<void> {
  await startRentArrears(page);
  await enterArrearsAmounts(page);
  await answer(page, 'Create a rent statement');
  await page.getByLabel('Which date of the month is rent due?').fill('1');
  await saveAndContinue(page);

  await fillDate(page, 'statementStart', '1', '6', '2026');
  await fillDate(page, 'statementEnd', '31', '8', '2026');
  await saveAndContinue(page);
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.last()).toContainText('£3,000.00');

  await page.getByRole('link', { name: 'Add a payment in June 2026' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add a payment in this period (1 June 2026 to 30 June 2026)' })
  ).toBeVisible();
  await addPayment(page, '5', '120', 'Yes');
  await addPayment(page, '15', '200', 'No');
  await expect(rows).toHaveCount(4);
  await expect(rows.last()).toContainText('£2,680.00');

  await page.getByRole('link', { name: 'Change payment in June 2026 paid on 15/6/2026' }).click();
  await page
    .getByRole('group', { name: 'Do you want to remove this payment from the rent statement?' })
    .getByRole('radio', { name: 'Yes' })
    .check();
  await saveAndContinue(page);
  await expect(rows).toHaveCount(3);
  await expect(rows.last()).toContainText('£2,880.00');
  await saveAndContinue(page);
  await finishRentArrears(page);
}

export async function completeCircumstances(page: Page): Promise<void> {
  await openTask(page, 'Circumstances');
  await continueOn(page);
  await saveAndContinue(page);
  await saveAndContinue(page);
  await saveAndContinue(page);
  await expectTaskStatus(page, 'Circumstances', 'Done');
}

export async function completeUploadDocuments(page: Page): Promise<void> {
  await openTask(page, 'Upload documents');
  await saveAndContinue(page);
  await expectTaskStatus(page, 'Upload documents', 'Done');
}

/** The check your answers task asks its final questions, then runs straight on to checking the answers. */
export async function answerFinalQuestions(page: Page): Promise<void> {
  await openTask(page, 'Check your answers and submit');
  await continueOn(page);
  await answer(page, 'No');
  await answer(page, 'No');
  await continueOn(page);
  await continueOn(page);
  await answer(page, 'English');
}

/** Signs the statement of truth and submits, ending on the claim fee page. */
export async function submitClaim(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Check your answers' })).toBeVisible();
  await expect(page.getByText('Billy Wright')).toBeVisible();
  await page.getByRole('checkbox', { name: /^I understand that proceedings for contempt of court/ }).check();
  await page.getByRole('checkbox', { name: 'I believe that the facts stated in this claim form are true.' }).check();
  await page.getByLabel('Your full name').fill('Billy Wright');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pay your claim fee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay claim fee' })).toBeVisible();
}

/** The claim the browser is on, from the page's address. */
function caseReferenceOnPage(page: Page): string {
  const caseReference = /\/case\/(\d{16})\//.exec(page.url())?.[1];
  expect(caseReference, `a case reference in ${page.url()}`).toBeDefined();
  return caseReference as string;
}

/** From the claim fee page to GOV.UK Pay's test service, with the card details entered. */
async function enterClaimFeeCard(page: Page, cardNumber: string): Promise<void> {
  await page.getByRole('button', { name: 'Pay claim fee' }).click();
  await performValidation('mainHeader', paymentDetails.mainHeader);
  await performAction('inputCounterClaimPaymentDetails', { cardNumber });
}

/**
 * Pays the claim fee by card and checks the confirmation. Payments tells pcs-api about the payment a little later,
 * so the page may still say the payment is being processed; either way it names the claim.
 */
export async function payClaimFee(page: Page): Promise<void> {
  const caseReference = caseReferenceOnPage(page);
  await enterClaimFeeCard(page, paymentDetails.validCardNumber);
  await performValidation('mainHeader', paymentDetails.confirmPaymentHeader);
  await performAction('clickButton', paymentDetails.confirmPaymentButton);
  await expect(page).toHaveURL(new RegExp(`/case/${caseReference}/claim-submitted`));
  await expect(page.locator('.govuk-panel__title')).toHaveText(
    /^\s*(Your payment was successful|Your payment is being processed)\s*$/
  );
  await expect(page.locator('.govuk-panel__body')).toContainText(formatCaseReferenceForDisplay(caseReference));
}

/**
 * From the claim submitted page, follows the claim form link to the claimant dashboard, then finds the claim in the
 * account page as a submitted claim that leads back to the dashboard.
 */
export async function viewClaimantDashboardAndAccount(page: Page): Promise<void> {
  const caseReference = caseReferenceOnPage(page);
  await page.getByRole('link', { name: 'View your claim form' }).click();
  await expect(page).toHaveURL(new RegExp(`/case/${caseReference}/claimant-dashboard$`));
  await expect(page.getByText(`Case number: ${formatCaseReferenceForDisplay(caseReference)}`)).toBeVisible();
  await expect(page.getByText('You’ve made a property possession claim')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View the claim form' })).toHaveAttribute(
    'href',
    `/case/${caseReference}/view-documents`
  );
  await expect(page.getByRole('link', { name: 'View documents' })).toBeVisible();
  await expect(page.getByText('Contact us for help')).toBeVisible();

  await page.goto(`${process.env.TEST_URL}/claims`);
  await expect(page.getByRole('heading', { level: 1, name: 'Your property possession account' })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(`Submitted claim ${caseReference}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Make a housing possession claim' })).toHaveAttribute(
    'href',
    '/make-a-claim'
  );
  await page.getByRole('link', { name: 'Submitted claim' }).click();
  await expect(page).toHaveURL(new RegExp(`/case/${caseReference}/claimant-dashboard$`));
}

/** A declined card returns the claimant to the claim fee page, told it failed, with the payment to try again. */
export async function declineClaimFeeCard(page: Page): Promise<void> {
  const caseReference = caseReferenceOnPage(page);
  await enterClaimFeeCard(page, paymentDetails.declinedCardNumber);
  await performValidation('mainHeader', 'Your payment has been declined');
  await performAction('clickButton', paymentDetails.startDynamicButton);
  await expect(page).toHaveURL(new RegExp(`/case/${caseReference}/pay-claim-fee\\?payment=failed$`));
  await expect(page.getByText('Your payment was not successful. You have not been charged. Try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay claim fee' })).toBeVisible();
}
