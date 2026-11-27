import type { Request } from 'express';

import { getClaimantClaims } from '@services/pcsApi/pcsApiService';
import {
  findClaimantClaim,
  formatClaimantPropertyAddress,
  isClaimantOfCase,
  isDraftClaim,
} from '@utils/claimantClaims';
import { isMakeAClaimEnabled } from '@utils/makeAClaimFlags';

jest.mock('@services/pcsApi/pcsApiService', () => ({ getClaimantClaims: jest.fn() }));
jest.mock('@utils/makeAClaimFlags', () => ({ isMakeAClaimEnabled: jest.fn() }));
jest.mock('@modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() })) },
}));

const CASE = '1234567890123456';

function reqWithRoles(roles: string[], accessToken: string | null = 'token'): Request {
  return { session: { user: { accessToken, roles } } } as unknown as Request;
}

describe('claimantClaims', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isMakeAClaimEnabled as jest.Mock).mockResolvedValue(true);
    (getClaimantClaims as jest.Mock).mockResolvedValue([{ caseReference: CASE, state: 'CASE_ISSUED' }]);
  });

  describe('isDraftClaim', () => {
    it('is true only while the case awaits submission', () => {
      expect(isDraftClaim({ state: 'AWAITING_SUBMISSION_TO_HMCTS' })).toBe(true);
      expect(isDraftClaim({ state: 'PENDING_CASE_ISSUED' })).toBe(false);
    });
  });

  describe('formatClaimantPropertyAddress', () => {
    it('joins the address lines that are present', () => {
      expect(
        formatClaimantPropertyAddress({ addressLine1: '15 Garden Drive', postTown: 'Luton', postcode: 'LU1 1AB' })
      ).toBe('15 Garden Drive, Luton, LU1 1AB');
    });

    it('is undefined without an address', () => {
      expect(formatClaimantPropertyAddress(undefined)).toBeUndefined();
    });
  });

  describe('findClaimantClaim', () => {
    it('finds the claim by case reference', async () => {
      expect(await findClaimantClaim('token', CASE)).toEqual({ caseReference: CASE, state: 'CASE_ISSUED' });
      expect(getClaimantClaims).toHaveBeenCalledWith('token');
    });

    it('is undefined for a case the citizen did not create', async () => {
      expect(await findClaimantClaim('token', '9999999999999999')).toBeUndefined();
    });
  });

  describe('isClaimantOfCase', () => {
    it('is true for a citizen who created the case', async () => {
      expect(await isClaimantOfCase(reqWithRoles(['citizen']), CASE)).toBe(true);
    });

    it('is false for a case they did not create', async () => {
      expect(await isClaimantOfCase(reqWithRoles(['citizen']), '9999999999999999')).toBe(false);
    });

    it('is false while the journey is switched off', async () => {
      (isMakeAClaimEnabled as jest.Mock).mockResolvedValue(false);
      expect(await isClaimantOfCase(reqWithRoles(['citizen']), CASE)).toBe(false);
    });

    it.each([['caseworker-pcs-solicitor'], ['caseworker']])(
      'is false for the %s role, without asking pcs-api',
      async role => {
        expect(await isClaimantOfCase(reqWithRoles([role]), CASE)).toBe(false);
        expect(getClaimantClaims).not.toHaveBeenCalled();
      }
    );

    it('is false when pcs-api fails', async () => {
      (getClaimantClaims as jest.Mock).mockRejectedValue(new Error('down'));
      expect(await isClaimantOfCase(reqWithRoles(['citizen']), CASE)).toBe(false);
    });

    it('is false when signed out', async () => {
      expect(await isClaimantOfCase(reqWithRoles(['citizen'], null), CASE)).toBe(false);
    });
  });
});
