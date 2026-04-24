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
    it('returns true when at least one ground is rent arrears', async () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'Yes' } }]);

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(true);
    });

    it('returns false when no grounds are rent arrears', async () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'NO' } }]);

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(false);
    });
  });

  describe('hasOnlyRentArrearsGrounds', () => {
    it('returns true when all grounds are rent arrears', async () => {
      const req = buildReq([{ value: { isRentArrears: 'Yes' } }, { value: { isRentArrears: 'YES' } }]);

      await expect(hasOnlyRentArrearsGrounds(req)).resolves.toBe(true);
    });

    it('returns false when there is a mix of rent and non-rent arrears grounds', async () => {
      const req = buildReq([{ value: { isRentArrears: 'Yes' } }, { value: { isRentArrears: 'No' } }]);

      await expect(hasOnlyRentArrearsGrounds(req)).resolves.toBe(false);
    });

    it('returns false when grounds are missing', async () => {
      const req = buildReq(undefined);
      await expect(hasOnlyRentArrearsGrounds(req)).resolves.toBe(false);
    });
  });
});
