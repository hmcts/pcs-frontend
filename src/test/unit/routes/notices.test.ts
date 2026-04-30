import type { Application, Request, Response } from 'express';

import noticesRoute from '@routes/notices';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('notices route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-orders-and-notices with oidc middleware', () => {
    noticesRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-orders-and-notices',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should render the view-orders-and-notices template', () => {
    noticesRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('view-orders-and-notices');
  });
});