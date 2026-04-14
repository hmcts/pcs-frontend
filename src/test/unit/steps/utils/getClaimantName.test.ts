import type { Request } from 'express';

import { getClaimantName } from '../../../../main/steps/utils/getClaimantName';

const mockReq = (claimantName?: unknown): Request =>
  ({
    res: {
      locals: {
        validatedCase: {
          claimantName,
        },
      },
    },
  }) as unknown as Request;

describe('getClaimantName', () => {
  it('returns claimantName when present and non-empty', () => {
    expect(getClaimantName(mockReq('Possession Claims Solicitor Org'))).toBe('Possession Claims Solicitor Org');
  });

  it('falls back to Treetops Housing when claimantName is blank', () => {
    expect(getClaimantName(mockReq('   '))).toBe('Treetops Housing');
  });

  it('falls back to Treetops Housing when claimantName is missing', () => {
    expect(getClaimantName({} as Request)).toBe('Treetops Housing');
  });
});
