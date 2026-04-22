import type { Request } from 'express';

import { hasAnyRentArrearsGround } from '../../../../main/steps/utils/hasAnyRentArrearsGround';
import { hasOnlyRentArrearsGrounds } from '../../../../main/steps/utils/hasOnlyRentArrearsGrounds';

function buildReq(claimGroundSummaries: unknown): Request {
  return {
    res: {
      locals: {
        validatedCase: {
          data: { claimGroundSummaries },
        },
      },
    },
  } as unknown as Request;
}

function buildReqWithData(data: Record<string, unknown>): Request {
  return {
    res: {
      locals: {
        validatedCase: {
          data,
        },
      },
    },
  } as unknown as Request;
}

describe('rent arrears ground helpers', () => {
  describe('hasAnyRentArrearsGround', () => {
    it('returns true when at least one ground is rent arrears', () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'Yes' } }]);

      expect(hasAnyRentArrearsGround(req)).toBe(true);
    });

    it('returns false when no grounds are rent arrears', () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'NO' } }]);

      expect(hasAnyRentArrearsGround(req)).toBe(false);
    });

    it('returns true when claimGroundSummaries is empty but Wales discretionary includes rent arrears', () => {
      const req = buildReqWithData({
        claimGroundSummaries: [],
        secureGroundsWales_DiscretionaryGrounds: ['RENT_ARREARS_S157'],
      });

      expect(hasAnyRentArrearsGround(req)).toBe(true);
    });

    it('returns true when claimGroundSummaries is absent but intro/demoted grounds include RENT_ARREARS', () => {
      const req = buildReqWithData({
        introGrounds_IntroductoryDemotedOrOtherGrounds: ['RENT_ARREARS'],
      });

      expect(hasAnyRentArrearsGround(req)).toBe(true);
    });
  });

  describe('hasOnlyRentArrearsGrounds', () => {
    it('returns true when all grounds are rent arrears', () => {
      const req = buildReq([{ value: { isRentArrears: 'Yes' } }, { value: { isRentArrears: 'YES' } }]);

      expect(hasOnlyRentArrearsGrounds(req)).toBe(true);
    });

    it('returns false when there is a mix of rent and non-rent arrears grounds', () => {
      const req = buildReq([{ value: { isRentArrears: 'Yes' } }, { value: { isRentArrears: 'No' } }]);

      expect(hasOnlyRentArrearsGrounds(req)).toBe(false);
    });

    it('returns false when grounds are missing', () => {
      const req = buildReq(undefined);
      expect(hasOnlyRentArrearsGrounds(req)).toBe(false);
    });

    it('returns true when only Wales discretionary codes are rent-arrears types', () => {
      const req = buildReqWithData({
        secureGroundsWales_DiscretionaryGrounds: ['RENT_ARREARS_S157'],
      });

      expect(hasOnlyRentArrearsGrounds(req)).toBe(true);
    });

    it('returns false when Wales includes a non-rent-arrears discretionary code', () => {
      const req = buildReqWithData({
        secureGroundsWales_DiscretionaryGrounds: ['OTHER_GROUND', 'RENT_ARREARS_S157'],
      });

      expect(hasOnlyRentArrearsGrounds(req)).toBe(false);
    });
  });
});
