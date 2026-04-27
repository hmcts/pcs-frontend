import type { Request } from 'express';

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    saveDraftRespondToClaim: jest.fn().mockResolvedValue({ id: '123', data: {} }),
  },
}));

import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

const makeReq = (): Request =>
  ({
    session: { user: { accessToken: 'tok' } },
    res: { locals: { validatedCase: { id: '123', data: {} } } },
  }) as unknown as Request;

describe('saveDraftDefendantResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalises orphaned payment-chain fields before sending to the backend', async () => {
    const req = makeReq();
    const response = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES' as const,
          repayArrearsInstalments: 'YES' as const,
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    };

    await saveDraftDefendantResponse(req, response);

    expect(ccdCaseService.saveDraftRespondToClaim).toHaveBeenCalledWith('tok', '123', {
      possessionClaimResponse: {
        defendantResponses: {
          paymentAgreement: { repaymentPlanAgreed: 'YES' },
        },
      },
    });
  });

  it('does not mutate the caller-supplied response (pure boundary)', async () => {
    const req = makeReq();
    const response = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES' as const,
          repayArrearsInstalments: 'YES' as const,
        },
      },
    };
    const snapshot = JSON.stringify(response);

    await saveDraftDefendantResponse(req, response);

    expect(JSON.stringify(response)).toBe(snapshot);
  });

  it('passes the response through unchanged when nothing needs normalising', async () => {
    const req = makeReq();
    const response = {
      defendantResponses: {
        possessionNoticeReceived: 'YES' as const,
        noticeReceivedDate: '2024-01-15',
      },
    };

    await saveDraftDefendantResponse(req, response);

    expect(ccdCaseService.saveDraftRespondToClaim).toHaveBeenCalledWith('tok', '123', {
      possessionClaimResponse: {
        defendantResponses: {
          possessionNoticeReceived: 'YES',
          noticeReceivedDate: '2024-01-15',
        },
      },
    });
  });
});
