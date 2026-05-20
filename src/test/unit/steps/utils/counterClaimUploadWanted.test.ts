import type { Request } from 'express';

import { counterClaimUploadWanted } from '../../../../main/steps/utils/counterClaimUploadWanted';

const makeReq = (counterClaimWantToUploadFiles?: string): Request =>
  ({
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              defendantResponses: {
                ...(counterClaimWantToUploadFiles !== undefined && { counterClaimWantToUploadFiles }),
              },
            },
          },
        },
      },
    },
  }) as unknown as Request;

describe('counterClaimUploadWanted', () => {
  it('returns true when counterClaimWantToUploadFiles is YES', () => {
    expect(counterClaimUploadWanted(makeReq('YES'))).toBe(true);
  });

  it('returns false when counterClaimWantToUploadFiles is NO', () => {
    expect(counterClaimUploadWanted(makeReq('NO'))).toBe(false);
  });

  it('returns false when counterClaimWantToUploadFiles is absent', () => {
    expect(counterClaimUploadWanted(makeReq())).toBe(false);
  });

  it('returns false when res.locals is absent', () => {
    const req = { res: undefined } as unknown as Request;
    expect(counterClaimUploadWanted(req)).toBe(false);
  });
});
