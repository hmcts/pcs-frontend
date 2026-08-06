import type { Application, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../../../main/constants/caseRoutes';

import makeOrderRoute from '@routes/makeOrder';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../main/middleware/legalRepresentativeHeaders', () => ({
  legalRepresentativeHeaderMiddleware: jest.fn((req, res, next) => next()),
}));

describe('make order route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/make-order with oidc and header middleware', () => {
    makeOrderRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      MAKE_ORDER_ROUTE,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should render the make-order template', () => {
    makeOrderRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][3] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('make-order');
  });
});
