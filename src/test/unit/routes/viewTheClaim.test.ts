import type { Application, Request, Response } from 'express';

import viewTheClaimRoute from '@routes/viewTheClaim';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn(() => '/dashboard/1234567890123456'),
}));

jest.mock('@utils/viewTheClaim/viewTheClaimUtils', () => ({
  buildViewTheClaimPageData: jest.fn(() => ({
    caseReference: '1234567890123456',
    propertyAddressHtml: '10 Second Avenue<br>London<br>W3 7RX',
    claimPdfSection: { title: 'Download a PDF copy of the claim', rows: [] },
    sections: [],
    documentsUrl: '/case/1234567890123456/view-documents',
  })),
}));

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

  it('should render the view-the-claim template with page data', () => {
    viewTheClaimRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = {
      locals: {
        validatedCase: {
          id: '1234567890123456',
          data: {
            claimantName: 'Treetops Housing',
          },
        },
      },
      render: jest.fn(),
    } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith(
      'view-the-claim',
      expect.objectContaining({
        caseReference: '1234567890123456',
        dashboardUrl: '/dashboard/1234567890123456',
        backUrl: '/dashboard/1234567890123456',
      })
    );
  });

  it('should return 404 when validated case is missing', () => {
    viewTheClaimRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response, next: jest.Mock) => void;
    const next = jest.fn();
    const res = { locals: {}, render: jest.fn() } as unknown as Response;

    handler({} as Request, res, next);

    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});
