import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraft: jest.fn(),
  },
}));

describe('buildCcdCaseForPossessionClaimResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes res.locals.validatedCase with the updated CCD response', async () => {
    const updatedCase = {
      id: '123',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            freeLegalAdvice: 'YES',
          },
        },
      },
    };

    (ccdCaseService.updateDraft as jest.Mock).mockResolvedValue(updatedCase);

    const req = {
      session: {
        user: {
          accessToken: 'token',
        },
      },
      res: {
        locals: {
          validatedCase: {
            id: '123',
          },
        },
      },
    } as unknown as Request;

    await buildCcdCaseForPossessionClaimResponse(req, {
      defendantResponses: {
        freeLegalAdvice: 'YES',
      },
    });

    expect(req.res?.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
    expect(req.res?.locals?.validatedCase?.defendantResponsesFreeLegalAdvice).toBe('YES');
  });

  it('preserves the existing case id when draft save response omits it', async () => {
    (ccdCaseService.updateDraft as jest.Mock).mockResolvedValue({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            freeLegalAdvice: 'NO',
          },
        },
      },
    });

    const req = {
      session: {
        user: {
          accessToken: 'token',
        },
      },
      res: {
        locals: {
          validatedCase: {
            id: '1773071952538472',
            data: {},
          },
        },
      },
    } as unknown as Request;

    await buildCcdCaseForPossessionClaimResponse(req, {
      defendantResponses: {
        freeLegalAdvice: 'NO',
      },
    });

    expect(req.res?.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
    expect(req.res?.locals?.validatedCase?.id).toBe('1773071952538472');
    expect(req.res?.locals?.validatedCase?.defendantResponsesFreeLegalAdvice).toBe('NO');
  });

  it('merges partial draft save response with existing validated case data', async () => {
    (ccdCaseService.updateDraft as jest.Mock).mockResolvedValue({
      id: '1773071952538472',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            freeLegalAdvice: 'NO',
          },
        },
      },
    });

    const req = {
      session: {
        user: {
          accessToken: 'token',
        },
      },
      res: {
        locals: {
          validatedCase: {
            id: '1773071952538472',
            data: {
              dateIssued: '2025-06-16',
              possessionClaimResponse: {
                claimantOrganisations: [{ value: 'Possession Claims Solicitor Org' }],
                defendantResponses: {
                  defendantNameConfirmation: 'YES',
                },
              },
            },
          },
        },
      },
    } as unknown as Request;

    await buildCcdCaseForPossessionClaimResponse(req, {
      defendantResponses: {
        freeLegalAdvice: 'NO',
      },
    });

    expect(req.res?.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
    expect(req.res?.locals?.validatedCase?.dateIssued).toEqual(new Date('2025-06-16'));
    expect(req.res?.locals?.validatedCase?.claimantName).toBe('Possession Claims Solicitor Org');
    expect(req.res?.locals?.validatedCase?.defendantResponsesDefendantNameConfirmation).toBe('YES');
    expect(req.res?.locals?.validatedCase?.defendantResponsesFreeLegalAdvice).toBe('NO');
  });
});
