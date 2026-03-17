import type { Request } from 'express';

import { CcdCaseModel } from '../../../../main/interfaces/ccdCaseData.model';
import { buildCcdCaseForPossessionClaimResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraftRespondToClaim: jest.fn(),
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
            receivedFreeLegalAdvice: 'YES',
          },
        },
      },
    };

    (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mockResolvedValue(updatedCase);

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
        receivedFreeLegalAdvice: 'YES',
      },
    });

    expect(req.res?.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
    expect(req.res?.locals?.validatedCase?.defendantResponsesReceivedFreeLegalAdvice).toBe('YES');
  });

  it('preserves the existing case id when draft save response omits it', async () => {
    (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mockResolvedValue({
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            receivedFreeLegalAdvice: 'NO',
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
        receivedFreeLegalAdvice: 'NO',
      },
    });

    expect(req.res?.locals?.validatedCase).toBeInstanceOf(CcdCaseModel);
    expect(req.res?.locals?.validatedCase?.id).toBe('1773071952538472');
    expect(req.res?.locals?.validatedCase?.defendantResponsesReceivedFreeLegalAdvice).toBe('NO');
  });
});
