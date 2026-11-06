import type { Request } from 'express';

import { getNextStep } from '../../../../main/modules/steps/flow';
import { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import { flowConfig } from '../../../../main/steps/make-a-claim/flow.config';
import { startFlowConfig } from '../../../../main/steps/make-a-claim/start/flow.config';

function requestFor(claim: CitizenPossessionClaim, rentHistoryDesign = 'ledger'): Request {
  const req = {} as Request;
  req.res = {
    locals: {
      rentHistoryDesign,
      validatedCase: new CcdCaseModel({ id: '1777027600017761', data: { citizenPossessionClaim: claim } }),
    },
  } as unknown as Request['res'];
  return req;
}

const next = (claim: CitizenPossessionClaim, step: string, design?: string) =>
  getNextStep(requestFor({ grounds: { hasRentArrearsGrounds: 'YES' }, ...claim }, design), step, flowConfig, {});

describe('before the claim exists', () => {
  const nextFrom = (step: string, answers: Record<string, unknown>) =>
    getNextStep({} as Request, step, startFlowConfig, {}, answers);

  it.each([
    ['claimant-type', { claimantType: 'PRIVATE_LANDLORD' }, 'trespass'],
    ['claimant-type', { claimantType: 'SOCIAL_LANDLORD' }, 'not-private-landlord'],
    ['claimant-type', { claimantType: 'MORTGAGE_LENDER' }, 'not-private-landlord'],
    ['trespass', { isTrespass: 'yes' }, 'trespass-ineligible'],
    ['trespass', { isTrespass: 'no' }, 'property-address'],
    ['property-address', {}, 'who-is-claiming'],
    ['who-is-claiming', { whoIsClaiming: 'AGENT' }, 'not-litigant-in-person'],
    ['property-country', { legislativeCountry: 'Wales' }, 'property-ineligible'],
    ['start', {}, 'claimant-type'],
  ])('goes from %s with %j to %s', async (step, answers, expected) => {
    await expect(nextFrom(step, answers)).resolves.toBe(expected);
  });
});

describe('the claim journey', () => {
  it.each([
    ['individual-or-organisation', { claimant: { individualOrOrganisation: 'INDIVIDUAL' } }, 'claimant-name'],
    ['individual-or-organisation', { claimant: { individualOrOrganisation: 'ORGANISATION' } }, 'organisation-name'],
    ['claimant-name', { claimant: { individualOrOrganisation: 'INDIVIDUAL' } }, 'claimant-address'],
    ['claimant-phone', { claimant: { contactByPhone: 'YES' } }, 'claimant-text-message'],
    ['claimant-phone', { claimant: { contactByPhone: 'NO' } }, 'multiple-claimants'],
    ['multiple-claimants', {}, 'claimant-cya'],
    ['tenancy-agreement', { tenancy: { tenancyAgreementAvailable: 'YES' } }, 'upload-tenancy-agreement'],
    ['tenancy-agreement', { tenancy: { tenancyAgreementAvailable: 'NO' } }, 'rent-arrears-claim'],
    ['rent-arrears-claim', { grounds: { hasRentArrearsGrounds: 'YES' } }, 'rent-arrears-grounds'],
    ['rent-arrears-claim', { grounds: { hasRentArrearsGrounds: 'NO' } }, 'other-grounds'],
    ['rent-arrears-grounds', { grounds: { hasRentArrearsGrounds: 'YES' } }, 'other-grounds-claim'],
    ['other-grounds-claim', { grounds: { hasRentArrearsGrounds: 'YES', hasOtherGrounds: 'YES' } }, 'other-grounds'],
    ['other-grounds-claim', { grounds: { hasRentArrearsGrounds: 'YES', hasOtherGrounds: 'NO' } }, 'tenancy-cya'],
    ['other-grounds', { grounds: { hasRentArrearsGrounds: 'NO', otherGrounds: ['GROUND_1A'] } }, 'ground-1a-reason'],
    ['other-grounds', { grounds: { hasRentArrearsGrounds: 'NO', otherGrounds: ['GROUND_2'] } }, 'tenancy-cya'],
    ['notice-served', { notice: { noticeServed: 'YES' } }, 'notice-type'],
    ['notice-served', { notice: { noticeServed: 'NO' } }, 'notice-cya'],
    ['notice-available', { notice: { noticeServed: 'YES', noticeAvailable: 'YES' } }, 'upload-notice'],
    ['notice-available', { notice: { noticeServed: 'YES', noticeAvailable: 'NO' } }, 'notice-cya'],
    ['notice-cya', { grounds: { hasRentArrearsGrounds: 'YES' } }, 'rent-arrears'],
    ['notice-cya', { grounds: { hasRentArrearsGrounds: 'NO' } }, 'circumstances'],
    [
      'rent-frequency',
      { rentArrears: { rentFrequency: 'MONTHLY' }, notice: { noticeServed: 'YES' } },
      'arrears-at-notice',
    ],
    [
      'rent-frequency',
      { rentArrears: { rentFrequency: 'MONTHLY' }, notice: { noticeServed: 'NO' } },
      'current-arrears',
    ],
    ['arrears-proof', { rentArrears: { proofType: 'UPLOAD_STATEMENT' } }, 'upload-rent-statement'],
    ['arrears-proof', { rentArrears: { proofType: 'LEDGER' } }, 'ledger-transaction'],
    [
      'arrears-proof',
      { rentArrears: { proofType: 'LEDGER', rentHistoryLedger: [{ value: { transactionDate: '2026-06-01' } }] } },
      'ledger-summary',
    ],
    ['ledger-summary', { rentArrears: { proofType: 'LEDGER' } }, 'money-judgment'],
    ['underlessee', { circumstances: { underlesseeExists: 'YES' } }, 'underlessee-name'],
    ['underlessee', { circumstances: { underlesseeExists: 'NO' } }, 'situation-cya'],
    ['language-used', {}, 'check-your-answers'],
  ] as [string, CitizenPossessionClaim, string][])('goes from %s with %j to %s', async (step, claim, expected) => {
    await expect(next(claim, step)).resolves.toBe(expected);
  });

  it('asks the rent due day only with the table design and monthly rent', async () => {
    const monthly: CitizenPossessionClaim = {
      rentArrears: { rentFrequency: 'MONTHLY' },
      notice: { noticeServed: 'NO' },
    };
    await expect(next(monthly, 'rent-frequency', 'table')).resolves.toBe('rent-due-day');
    await expect(
      next({ ...monthly, rentArrears: { rentFrequency: 'WEEKLY' } }, 'rent-frequency', 'table')
    ).resolves.toBe('current-arrears');
  });

  it('builds the rent statement table only with the table design', async () => {
    const table: CitizenPossessionClaim = { rentArrears: { proofType: 'TABLE' } };
    await expect(next(table, 'arrears-proof', 'table')).resolves.toBe('statement-period');
    await expect(next(table, 'statement-period', 'table')).resolves.toBe('rent-statement');
    await expect(next(table, 'rent-statement', 'table')).resolves.toBe('money-judgment');
    await expect(next(table, 'arrears-proof', 'ledger')).resolves.toBe('money-judgment');
  });

  it('shows no ledger with the table design', async () => {
    await expect(next({ rentArrears: { proofType: 'LEDGER' } }, 'arrears-proof', 'table')).resolves.toBe(
      'money-judgment'
    );
  });
});

describe('the tenancy summary', () => {
  it('carries on to the notice questions in the same section', async () => {
    await expect(next({}, 'tenancy-cya')).resolves.toBe('notice-details');
  });
});
