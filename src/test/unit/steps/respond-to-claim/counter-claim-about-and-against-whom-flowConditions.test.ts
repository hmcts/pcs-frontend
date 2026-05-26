import type { Request } from 'express';

import {
  shouldShowCounterClaimAboutStep,
  shouldShowCounterClaimAgainstWhoStep,
} from '../../../../main/steps/respond-to-claim/flowConditions';

type FakeReq = Request & {
  res: { locals: { validatedCase: { data: Record<string, unknown> } } };
};

type PartyFixture = {
  currentDefendantPartyId?: string;
  allClaimants?: { id: string; value: Record<string, unknown> }[];
  allDefendants?: { id: string; value: Record<string, unknown> }[];
};

const makeReq = (counterClaim: Record<string, unknown> | undefined, parties?: PartyFixture): FakeReq => {
  const possessionClaimResponse: Record<string, unknown> = {
    defendantResponses: {
      counterClaim,
    },
  };
  if (parties?.currentDefendantPartyId) {
    possessionClaimResponse.currentDefendantPartyId = parties.currentDefendantPartyId;
  }
  const data: Record<string, unknown> = {
    possessionClaimResponse,
  };
  if (parties?.allClaimants) {
    data.allClaimants = parties.allClaimants;
  }
  if (parties?.allDefendants) {
    data.allDefendants = parties.allDefendants;
  }
  return {
    res: {
      locals: {
        validatedCase: { data },
      },
    },
  } as unknown as FakeReq;
};

/** Named current defendant plus one other named defendant and one named claimant → hasMultipleParties is true */
const multiPartyFixture: PartyFixture = {
  currentDefendantPartyId: 'def-1',
  allDefendants: [
    { id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } },
    { id: 'def-2', value: { firstName: 'Other', lastName: 'Defendant' } },
  ],
  allClaimants: [{ id: 'claim-1', value: { orgName: 'Landlord Org' } }],
};

/** Current defendant plus one claimant only → hasMultipleParties is false */
const singleOtherPartyFixture: PartyFixture = {
  currentDefendantPartyId: 'def-1',
  allDefendants: [{ id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } }],
  allClaimants: [{ id: 'claim-1', value: { orgName: 'Landlord Org' } }],
};

describe('shouldShowCounterClaimAboutStep', () => {
  it('returns true when user already applied for counter-claim HWF', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'YES' });
    expect(shouldShowCounterClaimAboutStep(req)).toBe(true);
  });

  it('returns true when user does not need help with fees (without appliedForHwf in CCD)', () => {
    const req = makeReq({ needHelpWithFees: 'NO' });
    expect(shouldShowCounterClaimAboutStep(req)).toBe(true);
  });

  it('returns false when user needs HWF but has not recorded an appliedForHwf answer', () => {
    const req = makeReq({ needHelpWithFees: 'YES' });
    expect(shouldShowCounterClaimAboutStep(req)).toBe(false);
  });

  it('returns false when user needs HWF and has not yet applied', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'NO' });
    expect(shouldShowCounterClaimAboutStep(req)).toBe(false);
  });

  it('returns false when counterClaim data is absent', () => {
    const req = makeReq(undefined);
    expect(shouldShowCounterClaimAboutStep(req)).toBe(false);
  });
});

describe('shouldShowCounterClaimAgainstWhoStep', () => {
  it('returns true when there are multiple parties and user does not need HWF', () => {
    const req = makeReq({ needHelpWithFees: 'NO' }, multiPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(true);
  });

  it('returns true when there are multiple parties, user needs HWF, and has applied', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'YES' }, multiPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(true);
  });

  it('returns false when there are multiple parties but user needs HWF and has not applied', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'NO' }, multiPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(false);
  });

  it('returns false when there are multiple parties, user needs HWF, and applied is unset', () => {
    const req = makeReq({ needHelpWithFees: 'YES' }, multiPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(false);
  });

  it('returns false when only single other named party counts (not multiple)', () => {
    const req = makeReq({ needHelpWithFees: 'NO' }, singleOtherPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(false);
  });

  it('returns false when counterClaim data is absent even with multiple parties', () => {
    const req = makeReq(undefined, multiPartyFixture);
    expect(shouldShowCounterClaimAgainstWhoStep(req)).toBe(false);
  });
});
