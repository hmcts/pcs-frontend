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
  });
});
