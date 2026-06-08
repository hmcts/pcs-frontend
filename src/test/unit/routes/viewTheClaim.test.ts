import type { Application, Request, Response } from 'express';

import viewTheClaimRoute from '@routes/viewTheClaim';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn(() => '/dashboard/1234567890123456'),
}));

jest.mock('@utils/viewTheClaimUtils', () => ({
  buildViewTheClaimPageData: jest.fn(() => ({
    caseReference: '1234567890123456',
    propertyAddressHtml: '10 Second Avenue<br>London<br>W3 7RX',
    claimPdfSection: { title: 'Download a PDF copy of the claim', rows: [] },
    sections: [],
    documentsUrl: '/case/1234567890123456/view-documents',
  })),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;

describe('viewTheClaim route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-the-claim with oidc middleware', () => {
    viewTheClaimRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-the-claim',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should fetch the case and render the view-the-claim template with page data', async () => {
    mockGetCaseById.mockResolvedValue({
      id: '1234567890123456',
      data: {
        claimantName: 'Treetops Housing',
      },
    });

    viewTheClaimRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (
      req: Request,
      res: Response,
      next: jest.Mock
    ) => Promise<void>;
    const res = { render: jest.fn() } as unknown as Response;
    const next = jest.fn();
    const req = {
      params: { caseReference: '1234567890123456' },
      session: { user: { accessToken: 'token' } },
    } as unknown as Request;

    await handler(req, res, next);

    expect(mockGetCaseById).toHaveBeenCalledWith('token', '1234567890123456');
    expect(res.render).toHaveBeenCalledWith(
      'view-the-claim',
      expect.objectContaining({
        caseReference: '1234567890123456',
        dashboardUrl: '/dashboard/1234567890123456',
        backUrl: '/dashboard/1234567890123456',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when access token is missing', async () => {
    viewTheClaimRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (
      req: Request,
      res: Response,
      next: jest.Mock
    ) => Promise<void>;
    const next = jest.fn();
    const res = { render: jest.fn() } as unknown as Response;
    const req = {
      params: { caseReference: '1234567890123456' },
      session: {},
    } as unknown as Request;

    await handler(req, res, next);

    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
