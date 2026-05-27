import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { VIEW_RESPONSE_ROUTE } from '../../../main/constants/caseRoutes';
import { oidcMiddleware } from '../../../main/middleware';

import viewTheResponseRoute from '@routes/viewTheResponse';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => ((key: string) => key) as import('i18next').TFunction),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getViewDefendantResponse: jest.fn(),
  },
}));

describe('viewTheResponse route', () => {
  let app: Application;

  const caseReference = '1234567890123456';

  function viewTheResponseRequest(options: {
    caseReference?: string;
    sessionUser?: { accessToken?: string };
  }): Request {
    return {
      params: options.caseReference === undefined ? {} : { caseReference: options.caseReference },
      session: { user: options.sessionUser },
    } as unknown as Request;
  }

  function getHandler(): RequestHandler {
    const fn = (app.get as jest.Mock).mock.calls.find(call => call[0] === VIEW_RESPONSE_ROUTE)?.[2];
    if (typeof fn !== 'function') {
      throw new Error('view-the-response handler not registered');
    }
    return fn as RequestHandler;
  }

  beforeEach(() => {
    (ccdCaseService.getViewDefendantResponse as jest.Mock).mockResolvedValue({
      claimIssueDate: '2026-01-15',
      propertyAddress: {
        AddressLine1: '10 Second Avenue',
        PostTown: 'London',
        PostCode: 'W3 7RX',
      },
      possessionClaimResponse: {
        defendantResponses: {
          responseSubmittedDate: '2026-02-01',
          statementOfTruthCompletedBy: 'DEFENDANT',
        },
      },
    });

    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-the-response with oidc middleware', () => {
    viewTheResponseRoute(app);

    expect(app.get).toHaveBeenCalledWith(VIEW_RESPONSE_ROUTE, oidcMiddleware, expect.any(Function));
  });

  it('should render the view-the-response template with case data from getViewDefendantResponse', async () => {
    viewTheResponseRoute(app);

    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    expect(ccdCaseService.getViewDefendantResponse).toHaveBeenCalledWith('access-token-1', caseReference);
    expect(next).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'view-the-response',
      expect.objectContaining({
        caseReferenceDisplay: '1234 5678 9012 3456',
        caseDates: expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              key: { text: 'viewTheResponse:summary.dateIssued' },
              value: { text: '15 January 2026' },
            }),
            expect.objectContaining({
              key: { text: 'viewTheResponse:summary.dateSubmitted' },
              value: { text: '1 February 2026' },
            }),
          ]),
        }),
        dashboardUrl: `/dashboard/${caseReference}`,
        viewDocumentsUrl: `/case/${caseReference}/view-documents`,
      })
    );
  });

  it('should return 404 when case reference is invalid', async () => {
    viewTheResponseRoute(app);

    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference: 'not-a-case-ref',
        sessionUser: { accessToken: 'access-token-1' },
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid case reference format' }));
    expect(ccdCaseService.getViewDefendantResponse).not.toHaveBeenCalled();
  });

  it('should return 401 when access token is missing', async () => {
    viewTheResponseRoute(app);

    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: {},
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
    expect(ccdCaseService.getViewDefendantResponse).not.toHaveBeenCalled();
  });
});
