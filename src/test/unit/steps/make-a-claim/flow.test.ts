import type { Request } from 'express';

import { getNextStep } from '../../../../main/modules/steps/flow';
import { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import { flowConfig } from '../../../../main/steps/make-a-claim/flow.config';
import { startFlowConfig } from '../../../../main/steps/make-a-claim/start/flow.config';

function requestFor(claim: CitizenPossessionClaim): Request {
  const req = {} as Request;
  req.res = {
    locals: {
      validatedCase: new CcdCaseModel({ id: '1777027600017761', data: { citizenPossessionClaim: claim } }),
    },
  } as unknown as Request['res'];
  return req;
}

const next = (claim: CitizenPossessionClaim, step: string) =>
  getNextStep(requestFor({ grounds: { hasRentArrearsGrounds: 'YES' }, ...claim }), step, flowConfig, {});

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
    ['property-country', { legislativeCountry: 'Wales' }, 'wales-claimant-type'],
    ['property-country', { legislativeCountry: 'England' }, 'who-is-claiming'],
    ['wales-claimant-type', { walesClaimantType: 'PRIVATE_LANDLORD' }, 'who-is-claiming'],
    ['wales-claimant-type', { walesClaimantType: 'COMMUNITY_LANDLORD' }, 'not-private-landlord'],
    ['wales-claimant-type', { walesClaimantType: 'MORTGAGE_LENDER' }, 'not-private-landlord'],
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
    ['claimant-phone', { claimant: { contactByPhone: 'NO' } }, 'claimant-text-message'],
    ['multiple-claimants', {}, 'claimant-cya'],
    ['tenancy-agreement', { tenancy: { tenancyAgreementAvailable: 'YES' } }, 'upload-tenancy-agreement'],
    ['tenancy-agreement', { tenancy: { tenancyAgreementAvailable: 'NO' } }, 'rent-arrears-claim'],
    ['tenancy-details', {}, 'tenancy-type'],
    ['tenancy-details', { eligibility: { legislativeCountry: 'Wales' } }, 'occupation-contract-type'],
    ['occupation-contract-type', { eligibility: { legislativeCountry: 'Wales' } }, 'occupation-contract-start-date'],
    [
      'occupation-contract-start-date',
      { eligibility: { legislativeCountry: 'Wales' } },
      'occupation-contract-agreement',
    ],
    [
      'occupation-contract-agreement',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { tenancyAgreementAvailable: 'YES' } },
      'upload-occupation-contract',
    ],
    [
      'occupation-contract-agreement',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { tenancyAgreementAvailable: 'NO' } },
      'mandatory-documents',
    ],
    ['upload-occupation-contract', { eligibility: { legislativeCountry: 'Wales' } }, 'mandatory-documents'],
    ['mandatory-documents', { eligibility: { legislativeCountry: 'Wales' } }, 'epc-available'],
    [
      'epc-available',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasEnergyPerformanceCertificate: 'YES' } },
      'upload-epc',
    ],
    [
      'epc-available',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasEnergyPerformanceCertificate: 'NO' } },
      'gas-safety-available',
    ],
    [
      'upload-epc',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasEnergyPerformanceCertificate: 'YES' } },
      'gas-safety-available',
    ],
    [
      'gas-safety-available',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasGasSafetyReport: 'YES' } },
      'upload-gas-safety',
    ],
    [
      'gas-safety-available',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasGasSafetyReport: 'NO' } },
      'eicr-available',
    ],
    [
      'upload-gas-safety',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasGasSafetyReport: 'YES' } },
      'eicr-available',
    ],
    [
      'eicr-available',
      { eligibility: { legislativeCountry: 'Wales' }, tenancy: { hasElectricalInstallationConditionReport: 'YES' } },
      'upload-eicr',
    ],
    ['eicr-available', { eligibility: { legislativeCountry: 'Wales' } }, 'wales-grounds'],
    ['upload-eicr', { eligibility: { legislativeCountry: 'Wales' } }, 'wales-grounds'],
    [
      'wales-grounds',
      {
        eligibility: { legislativeCountry: 'Wales' },
        grounds: { walesDiscretionaryGrounds: ['OTHER_BREACH_OF_CONTRACT_S157'] },
      },
      'ground-reason',
    ],
    [
      'wales-grounds',
      {
        eligibility: { legislativeCountry: 'Wales' },
        grounds: { walesDiscretionaryGrounds: ['RENT_ARREARS_S157'], hasRentArrearsGrounds: 'YES' },
      },
      'tenancy-cya',
    ],
    [
      'wales-grounds',
      { eligibility: { legislativeCountry: 'Wales' }, grounds: { otherGrounds: ['OTHER'] } },
      'tenancy-cya',
    ],
    [
      'notice-cya',
      {
        eligibility: { legislativeCountry: 'Wales' },
        grounds: { walesMandatoryGrounds: ['SERIOUS_ARREARS_PERIODIC_S181'], hasRentArrearsGrounds: 'YES' },
      },
      'rent-arrears',
    ],
    ['tenancy-start-date', {}, 'tenancy-agreement'],
    ['rent-arrears-claim', { grounds: { hasRentArrearsGrounds: 'YES' } }, 'rent-arrears-grounds'],
    ['rent-arrears-claim', { grounds: { hasRentArrearsGrounds: 'NO' } }, 'other-grounds'],
    ['rent-arrears-grounds', { grounds: { hasRentArrearsGrounds: 'YES' } }, 'other-grounds-claim'],
    ['other-grounds-claim', { grounds: { hasRentArrearsGrounds: 'YES', hasOtherGrounds: 'YES' } }, 'other-grounds'],
    ['other-grounds-claim', { grounds: { hasRentArrearsGrounds: 'YES', hasOtherGrounds: 'NO' } }, 'tenancy-cya'],
    ['other-grounds', { grounds: { hasRentArrearsGrounds: 'NO', otherGrounds: ['GROUND_1A'] } }, 'ground-reason'],
    ['other-grounds', { grounds: { hasRentArrearsGrounds: 'NO', otherGrounds: ['OTHER'] } }, 'tenancy-cya'],
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
    ['upload-rent-statement', { rentArrears: { proofType: 'UPLOAD_STATEMENT' } }, 'money-judgment'],
    ['claimant-circumstances', {}, 'situation-cya'],
    ['language-used', {}, 'check-your-answers'],
  ] as [string, CitizenPossessionClaim, string][])('goes from %s with %j to %s', async (step, claim, expected) => {
    await expect(next(claim, step)).resolves.toBe(expected);
  });

  it('asks the rent due day after Create a rent statement, and only for monthly rent', async () => {
    const monthly: CitizenPossessionClaim = {
      rentArrears: { rentFrequency: 'MONTHLY', proofType: 'TABLE' },
      notice: { noticeServed: 'NO' },
    };
    await expect(next(monthly, 'rent-frequency')).resolves.toBe('current-arrears');
    await expect(next(monthly, 'arrears-proof')).resolves.toBe('rent-due-day');
    await expect(next(monthly, 'rent-due-day')).resolves.toBe('statement-period');
    const weekly: CitizenPossessionClaim = { rentArrears: { rentFrequency: 'WEEKLY', proofType: 'TABLE' } };
    await expect(next(weekly, 'arrears-proof')).resolves.toBe('statement-period');
  });

  it('creates a rent statement from the period, then shows it', async () => {
    const table: CitizenPossessionClaim = { rentArrears: { rentFrequency: 'WEEKLY', proofType: 'TABLE' } };
    await expect(next(table, 'statement-period')).resolves.toBe('rent-statement');
    await expect(next(table, 'rent-statement')).resolves.toBe('money-judgment');
  });

  it('asks for an upload, not a created statement, for Upload a rent statement', async () => {
    const upload: CitizenPossessionClaim = { rentArrears: { rentFrequency: 'MONTHLY', proofType: 'UPLOAD_STATEMENT' } };
    await expect(next(upload, 'arrears-proof')).resolves.toBe('upload-rent-statement');
    await expect(next(upload, 'upload-rent-statement')).resolves.toBe('money-judgment');
  });

  it('skips the created statement once the rent is paid at some other frequency', async () => {
    await expect(next({ rentArrears: { rentFrequency: 'OTHER', proofType: 'TABLE' } }, 'arrears-proof')).resolves.toBe(
      'money-judgment'
    );
  });
});

describe('the notice questions', () => {
  it('ask for the date the notice was served only under each method', async () => {
    await expect(next({ notice: { noticeServed: 'YES' } }, 'notice-type')).resolves.toBe('notice-method');
  });
});
