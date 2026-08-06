import type { Application, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../../../main/constants/caseRoutes';

import makeOrderRoute from '@routes/makeOrder';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@hmcts-cft/cft-ui-component-lib', () => ({
  buildHeaderModel: jest.fn(() => ({ assetsPath: 'default' })),
  buildFooterModel: jest.fn(() => ({ footer: true })),
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

  it('should register GET /case/:caseReference/make-order behind oidc', () => {
    makeOrderRoute(app);

    expect(app.get).toHaveBeenCalledWith(MAKE_ORDER_ROUTE, expect.any(Function), expect.any(Function));
  });

  it('should render the make-order template with the xui header and footer models', () => {
    makeOrderRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({ session: { user: { roles: ['caseworker-pcs-judge'] } } } as unknown as Request, res);

    expect(res.render).toHaveBeenCalledWith('make-order', {
      headerModel: { assetsPath: '/assets/ui-component-lib' },
      footerModel: { footer: true },
    });
  });

  it('should build the header menu from the signed-in user roles', () => {
    const { buildHeaderModel } = jest.requireMock('@hmcts-cft/cft-ui-component-lib');
    makeOrderRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    handler(
      { session: { user: { roles: ['Caseworker-PCS-Judge'] } } } as unknown as Request,
      {
        render: jest.fn(),
      } as unknown as Response
    );

    expect(buildHeaderModel).toHaveBeenCalledWith(
      expect.objectContaining({ user: { roles: ['caseworker-pcs-judge'] } })
    );
  });
});
