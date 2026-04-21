import type { Application, Request, Response } from 'express';

import viewTheClaimRoute from '@routes/viewTheClaim';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
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

  it('should render the view-the-claim template', () => {
    viewTheClaimRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('view-the-claim');
  });
});
