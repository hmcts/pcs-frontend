import type { Request } from 'express';

import { shouldShowCounterClaimNeedToApplyStep } from '../../../../main/steps/respond-to-claim/flowConditions';

type FakeReq = Request & {
  res: { locals: { validatedCase: { data: Record<string, unknown> } } };
};

const makeReq = (counterClaim: Record<string, unknown> | undefined): FakeReq =>
  ({
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              defendantResponses: {
                counterClaim,
              },
            },
          },
        },
      },
    },
  }) as unknown as FakeReq;

describe('shouldShowCounterClaimNeedToApplyStep', () => {
  it('returns true when user needs help with fees and has not applied for HWF', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'NO' });
    expect(shouldShowCounterClaimNeedToApplyStep(req)).toBe(true);
  });

  it('returns false when user does not need help with fees even if appliedForHwf is stale NO', () => {
    const req = makeReq({ needHelpWithFees: 'NO', appliedForHwf: 'NO' });
    expect(shouldShowCounterClaimNeedToApplyStep(req)).toBe(false);
  });

  it('returns false when needHelpWithFees is missing even if appliedForHwf is NO', () => {
    const req = makeReq({ appliedForHwf: 'NO' });
    expect(shouldShowCounterClaimNeedToApplyStep(req)).toBe(false);
  });

  it('returns false when user has already applied for HWF', () => {
    const req = makeReq({ needHelpWithFees: 'YES', appliedForHwf: 'YES' });
    expect(shouldShowCounterClaimNeedToApplyStep(req)).toBe(false);
  });

  it('returns false when counterClaim is absent', () => {
    const req = makeReq(undefined);
    expect(shouldShowCounterClaimNeedToApplyStep(req)).toBe(false);
  });

  it('returns false when needHelpWithFees is YES but appliedForHwf is not strictly NO', () => {
    const reqUnset = makeReq({ needHelpWithFees: 'YES' });
    expect(shouldShowCounterClaimNeedToApplyStep(reqUnset)).toBe(false);
  });
});
