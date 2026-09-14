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

const mockClientContextClearer = jest.fn(req => req);
jest.mock('@utils/clientContextSessionClearer', () => ({
  clientContextSessionClearer: mockClientContextClearer,
}));

import type { Request } from 'express';

import {
  RespondToClaimDraftChangedError,
  RespondToClaimSubmitRejectedError,
  getEndOfJourneyCyaDraftChangedPath,
  getEndOfJourneyCyaSubmitErrorPath,
  isDraftChangedError,
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
      expect(mockClientContextClearer).not.toHaveBeenCalled();
    });

    it('submits to CCD and returns confirmation path with client context header', async () => {
      mockHttpGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockHttpPost.mockResolvedValue({ data: {} });

      const req = {
        session: { user: { accessToken: 'mock-token' }, clientContext: { selectedPartyId: 'partyId' } },
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
      } as unknown as Request;

      const result = await submitRespondToClaimResponse(req);

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

// HDPI-8866 W05 — the submit carries the reviewed draft version and surfaces a DRAFT_CHANGED refusal distinctly.
describe('submitRespondToClaimResponse — reviewed draft version', () => {
  const reqWithDraftVersion = (draftVersion?: number): Request =>
    ({
      session: { user: { accessToken: 'mock-token' } },
      res: {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {
              possessionClaimResponse: {
                defendantResponses: { makeCounterClaim: 'NO' },
                ...(draftVersion !== undefined && { draftVersion }),
              },
            },
          },
        },
      },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet.mockResolvedValue({ data: { token: 'event-token' } });
  });

  it('sends the draft version the review page was rendered from', async () => {
    mockHttpPost.mockResolvedValue({ data: {} });

    await submitRespondToClaimResponse(reqWithDraftVersion(5));

    const [, payload] = mockHttpPost.mock.calls[0];
    expect(payload.data.possessionClaimResponse).toEqual({ draftVersion: 5 });
  });

  it('sends no draft version when the case carries none', async () => {
    mockHttpPost.mockResolvedValue({ data: {} });

    await submitRespondToClaimResponse(reqWithDraftVersion());

    const [, payload] = mockHttpPost.mock.calls[0];
    expect(payload.data.possessionClaimResponse).toEqual({});
  });

  it('maps a DRAFT_CHANGED refusal from CCD to RespondToClaimDraftChangedError', async () => {
    mockHttpPost.mockRejectedValue({
      response: { status: 422, data: { callbackErrors: ['DRAFT_CHANGED: Your answers have changed'] } },
    });

    await expect(submitRespondToClaimResponse(reqWithDraftVersion(5))).rejects.toBeInstanceOf(
      RespondToClaimDraftChangedError
    );
  });

  it('maps a validation refusal from pcs-api to RespondToClaimSubmitRejectedError carrying the messages', async () => {
    mockHttpPost.mockRejectedValue({
      response: { status: 422, data: { callbackErrors: ['Enter a valid postcode for correspondence address'] } },
    });

    const rejection = await submitRespondToClaimResponse(reqWithDraftVersion(5)).catch(error => error);

    expect(rejection).toBeInstanceOf(RespondToClaimSubmitRejectedError);
    expect(rejection.messages).toEqual(['Enter a valid postcode for correspondence address']);
  });

  it('rethrows any other CCD error unchanged', async () => {
    const boom = new Error('boom');
    mockHttpPost.mockRejectedValue(boom);

    await expect(submitRespondToClaimResponse(reqWithDraftVersion(5))).rejects.toBe(boom);
  });
});

describe('isDraftChangedError', () => {
  it.each([
    ['the typed error', new RespondToClaimDraftChangedError()],
    ['an HTTPError built from mid-event callback errors', new Error('CCD callback rejected request: DRAFT_CHANGED: x')],
    ['an axios error carrying callbackErrors', { response: { data: { callbackErrors: ['DRAFT_CHANGED: x'] } } }],
    ['an axios error carrying errors', { response: { data: { errors: ['DRAFT_CHANGED: x'] } } }],
  ])('recognises %s', (_label, error) => {
    expect(isDraftChangedError(error)).toBe(true);
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['an axios error with unrelated callback errors', { response: { data: { callbackErrors: ['Other'] } } }],
    ['undefined', undefined],
  ])('rejects %s', (_label, error) => {
    expect(isDraftChangedError(error)).toBe(false);
  });
});

describe('getEndOfJourneyCyaDraftChangedPath', () => {
  it('returns the review page with the draftChanged marker', () => {
    expect(getEndOfJourneyCyaDraftChangedPath('123')).toBe(
      '/case/123/respond-to-claim/end-of-journey-cya?draftChanged=1'
    );
  });
});
