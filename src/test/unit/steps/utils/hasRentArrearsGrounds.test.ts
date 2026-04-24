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
    it('returns true when at least one ground is rent arrears', async () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'Yes' } }]);

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(true);
    });

    it('returns false when no grounds are rent arrears', async () => {
      const req = buildReq([{ value: { isRentArrears: 'No' } }, { value: { isRentArrears: 'NO' } }]);

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(false);
    });

    it('returns true when summaries are empty but Wales discretionary includes rent arrears', async () => {
      const req = buildReqWithData({
        claimGroundSummaries: [],
        secureGroundsWales_DiscretionaryGrounds: ['RENT_ARREARS_S157'],
      });

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(true);
    });

    it('returns true when summaries are absent but intro/demoted includes rent arrears', async () => {
      const req = buildReqWithData({
        introGrounds_IntroductoryDemotedOrOtherGrounds: ['RENT_ARREARS'],
      });

      await expect(hasAnyRentArrearsGround(req)).resolves.toBe(true);
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

    it('returns true when only Wales discretionary rent-arrears grounds are present', async () => {
      const req = buildReqWithData({
        secureGroundsWales_DiscretionaryGrounds: ['RENT_ARREARS_S157'],
      });

      await expect(hasOnlyRentArrearsGrounds(req)).resolves.toBe(true);
    });

    it('returns false when Wales discretionary has mixed rent and non-rent grounds', async () => {
      const req = buildReqWithData({
        secureGroundsWales_DiscretionaryGrounds: ['OTHER_GROUND', 'RENT_ARREARS_S157'],
      });

      await expect(hasOnlyRentArrearsGrounds(req)).resolves.toBe(false);
    });
  });
});
