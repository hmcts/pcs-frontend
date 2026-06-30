const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockHttpGet = jest.fn();
const mockHttpPost = jest.fn();
jest.mock('../../../../main/modules/http', () => ({
  http: {
    get: mockHttpGet,
    post: mockHttpPost,
  },
}));

jest.mock('config', () => ({
  get: jest.fn(() => 'http://ccd.test'),
}));

import type { Request } from 'express';

import {
  getEndOfJourneyCyaSubmitErrorPath,
  parseSubmitPaymentPayload,
  submitRespondToClaimResponse,
} from '../../../../main/steps/utils/respondToClaimFinalSubmit';

describe('respondToClaimFinalSubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseSubmitPaymentPayload', () => {
    it('parses nested counterClaim confirmation body', () => {
      const payload = parseSubmitPaymentPayload(
        JSON.stringify({
          counterClaim: {
            serviceRequestReference: '2026-123',
            feeAmount: 11500,
            claimType: 'KNOWN_AMOUNT',
          },
        })
      );

      expect(payload).toEqual({
        serviceRequestReference: '2026-123',
        feeAmount: 11500,
        counterClaimType: 'KNOWN_AMOUNT',
      });
    });

    it('returns undefined when service request reference is missing', () => {
      expect(parseSubmitPaymentPayload(JSON.stringify({ counterClaim: {} }))).toBeUndefined();
    });
  });

  describe('getEndOfJourneyCyaSubmitErrorPath', () => {
    it('returns end-of-journey CYA submit error URL', () => {
      expect(getEndOfJourneyCyaSubmitErrorPath('1234567890123456')).toBe(
        '/case/1234567890123456/respond-to-claim/end-of-journey-cya?submitError=failed'
      );
    });
  });

  describe('submitRespondToClaimResponse', () => {
    const createReq = (overrides: Record<string, unknown> = {}) =>
      ({
        session: { user: { accessToken: 'mock-token' } },
        res: {
          locals: {
            validatedCase: {
              id: '1234567890123456',
              data: {
                possessionClaimResponse: {
                  defendantResponses: { makeCounterClaim: 'NO' },
                },
              },
            },
          },
        },
        ...overrides,
      }) as unknown as Request;

    it('throws when validatedCase is missing', async () => {
      const req = createReq({ res: { locals: {} } });
      await expect(submitRespondToClaimResponse(req)).rejects.toThrow('validatedCase is undefined');
    });

    it('throws when access token is missing', async () => {
      const req = createReq({ session: {} });
      await expect(submitRespondToClaimResponse(req)).rejects.toThrow('No user access token in session');
    });

    it('submits to CCD and returns confirmation path', async () => {
      mockHttpGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockHttpPost.mockResolvedValue({ data: {} });

      const result = await submitRespondToClaimResponse(createReq());

      expect(result.confirmationPath).toBe('/case/1234567890123456/respond-to-claim/response-submitted');
      expect(mockHttpPost).toHaveBeenCalled();
    });

    it('persists payment session when counterclaim fee payment is required', async () => {
      mockHttpGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockHttpPost.mockResolvedValue({
        data: {
          after_submit_callback_response: {
            confirmation_body: JSON.stringify({
              counterClaim: {
                serviceRequestReference: '2026-999',
                feeAmount: 11500,
                claimType: 'KNOWN_AMOUNT',
              },
            }),
          },
        },
      });

      const req = createReq({
        res: {
          locals: {
            validatedCase: {
              id: '1234567890123456',
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    makeCounterClaim: 'YES',
                    counterClaim: { claimType: 'KNOWN_AMOUNT', claimAmount: 5000 },
                  },
                },
              },
            },
          },
        },
        session: {
          user: { accessToken: 'mock-token' },
          save: jest.fn(callback => {
            callback?.(undefined);
          }),
        },
      });

      const result = await submitRespondToClaimResponse(req);

      expect(result.confirmationPath).toBe(
        '/case/1234567890123456/respond-to-claim/response-submitted-counter-claim-fee-payment-needed'
      );
      expect(req.session.payment).toEqual(
        expect.objectContaining({
          caseReference: '1234567890123456',
          serviceRequestReference: '2026-999',
          feeAmount: 11500,
        })
      );
    });
  });
});
