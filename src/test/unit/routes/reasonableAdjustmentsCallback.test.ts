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

const mockOidcMiddleware = jest.fn((req, res, next) => next());
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: mockOidcMiddleware,
}));

const mockFeatureMiddleware = jest.fn((req, res, next) => next());
jest.mock('../../../main/middleware/respondToClaimFeatureMiddleware', () => ({
  respondToClaimFeatureMiddleware: mockFeatureMiddleware,
}));

const mockCuiYsMiddleware = jest.fn((req, res, next) => next());
jest.mock('../../../main/middleware/cuiYourSupportFeatureMiddleware', () => ({
  cuiYourSupportFeatureMiddleware: mockCuiYsMiddleware,
}));

const mockGetPayload = jest.fn();
jest.mock('@services/cuiRa/cuiRaService', () => ({
  cuiRaService: { getPayload: mockGetPayload },
}));

const mockUpdateDraft = jest.fn();
const mockGetCaseByIdForEvent = jest.fn();
jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: { updateDraft: mockUpdateDraft, getCaseByIdForEvent: mockGetCaseByIdForEvent },
}));

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    if (key === 's2s.key') {
      return 's2s:service-token';
    }
    throw new Error(`Unexpected config key: ${key}`);
  }),
}));

const mockSafeRedirect303 = jest.fn();
jest.mock('@utils/safeRedirect', () => ({
  safeRedirect303: mockSafeRedirect303,
}));

import type { Application, Request, Response } from 'express';

import reasonableAdjustmentsCallbackRoutes from '../../../main/routes/reasonableAdjustmentsCallback';
import { RESPOND_TO_CLAIM_DRAFT_EVENT } from '../../../main/steps/respond-to-claim/draftEvent';

const ROUTE = '/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id';
const confirmationUrl = '/case/123/respond-to-claim/reasonable-adjustments-confirmation';
const cancelledUrl = '/case/123/respond-to-claim/reasonable-adjustments-cancelled';
const errorUrl = '/case/123/respond-to-claim/reasonable-adjustments-error';

describe('reasonableAdjustmentsCallback routes', () => {
  let mockAppGet: jest.Mock;

  const buildReq = (serviceToken: string | null): Request =>
    ({
      params: { caseReference: '123', id: 'abc-1' },
      session: { user: { accessToken: 'user-tok' }, clientContext: { context: 'x' } },
      app: { locals: { redisClient: { get: jest.fn().mockResolvedValue(serviceToken) } } },
    }) as unknown as Request;

  // The route handler is the last argument registered (after oidc + feature-flag middleware).
  const getHandler = () => mockAppGet.mock.calls[0].at(-1) as (req: Request, res: Response) => Promise<void>;

  // The existing in-progress response the callback loads before writing flags. Includes
  // claimant-side fields to prove the callback narrows to the defendant slice and does not
  // round-trip them back through the citizen draft-save.
  const existingResponse = {
    defendantResponses: { situation_HasMoved: 'NO' },
    defendantContactDetails: { party: { emailAddress: 'defendant@example.com' } },
    claimantName: 'Acme Landlord',
    claimantEnteredDefendantDetails: { firstName: 'Jo' },
  };
  // Only the defendant slice should be re-sent (defendantContactDetails + defendantResponses).
  const expectedDefendantSlice = {
    defendantContactDetails: { party: { emailAddress: 'defendant@example.com' } },
    defendantResponses: { situation_HasMoved: 'NO' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCaseByIdForEvent.mockResolvedValue({ id: '123', data: { possessionClaimResponse: existingResponse } });
    mockAppGet = jest.fn();
    reasonableAdjustmentsCallbackRoutes({ get: mockAppGet } as unknown as Application);
  });

  it('registers the callback route behind oidc, the respond-to-claim and the Your Support feature-flag middleware', () => {
    expect(mockAppGet).toHaveBeenCalledWith(
      ROUTE,
      mockOidcMiddleware,
      mockFeatureMiddleware,
      mockCuiYsMiddleware,
      expect.any(Function)
    );
  });

  it('redirects to the error page when no S2S service token is available', async () => {
    const res = {} as unknown as Response;

    await getHandler()(buildReq(null), res);

    expect(mockGetPayload).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });

  it('loads the current response and persists the flags (path remapped to CCD ListValue) on submit', async () => {
    // cui-ra emits path items as { name }; pcs-api wants { value } (ListValue<String>).
    const flags = {
      partyName: 'John Doe',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'd1',
          value: {
            name: 'Language interpreter',
            flagCode: 'RA0042',
            path: [{ id: 'p1', name: 'Reasonable adjustment' }, { name: 'Support' }],
          },
        },
      ],
    };
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123', replacementFlags: flags });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockGetPayload).toHaveBeenCalledWith('abc-1', 's2s-tok');
    // Loads the in-progress defendant response so the REPLACE-style draft-save doesn't wipe answers.
    expect(mockGetCaseByIdForEvent).toHaveBeenCalledWith('user-tok', '123', 'respondPossessionClaim', {
      context: 'x',
    });
    expect(mockUpdateDraft).toHaveBeenCalledWith(
      RESPOND_TO_CLAIM_DRAFT_EVENT,
      'user-tok',
      '123',
      {
        possessionClaimResponse: {
          ...expectedDefendantSlice,
          defendantFlags: {
            partyName: 'John Doe',
            roleOnCase: 'Defendant',
            details: [
              {
                id: 'd1',
                value: {
                  name: 'Language interpreter',
                  flagCode: 'RA0042',
                  path: [{ id: 'p1', value: 'Reasonable adjustment' }, { value: 'Support' }],
                },
              },
            ],
          },
        },
      },
      { context: 'x' }
    );
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, confirmationUrl, '/case/123', ['/case']);
  });

  it('routes to the "no request sent" page (no persist) when only flagsAsSupplied is returned — no change was made', async () => {
    const flags = { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] };
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123', flagsAsSupplied: flags });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockUpdateDraft).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, cancelledUrl, '/case/123', ['/case']);
  });

  it('routes to the "no request sent" page (no persist) when a submit carries no flags at all', async () => {
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123' });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockUpdateDraft).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, cancelledUrl, '/case/123', ['/case']);
  });

  it('redirects to the "no request sent" page (and does not persist) when the action is cancel', async () => {
    mockGetPayload.mockResolvedValue({ action: 'cancel', correlationId: '123' });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockUpdateDraft).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, cancelledUrl, '/case/123', ['/case']);
  });

  it('redirects to the error page when payload retrieval fails', async () => {
    mockGetPayload.mockRejectedValue(new Error('boom'));
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });

  it('refuses to persist and redirects to the error page when the payload correlationId does not match the case', async () => {
    const flags = { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] };
    // correlationId belongs to a different case than the one in the callback URL (123).
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '999', replacementFlags: flags });
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    // Access check runs first; the mismatch is caught before any persistence.
    expect(mockGetCaseByIdForEvent).toHaveBeenCalled();
    expect(mockUpdateDraft).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });

  it('redirects to the error page when loading the current response fails', async () => {
    const flags = { partyName: 'x', roleOnCase: 'y', details: [] };
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123', replacementFlags: flags });
    mockGetCaseByIdForEvent.mockRejectedValue(new Error('case load down'));
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockUpdateDraft).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });

  it('redirects to the error page when persisting the flags fails', async () => {
    const flags = { partyName: 'x', roleOnCase: 'y', details: [] };
    mockGetPayload.mockResolvedValue({ action: 'submit', correlationId: '123', replacementFlags: flags });
    mockUpdateDraft.mockRejectedValue(new Error('ccd down'));
    const res = {} as unknown as Response;

    await getHandler()(buildReq('s2s-tok'), res);

    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, errorUrl, '/case/123', ['/case']);
  });
});
