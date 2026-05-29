import type { Application, Request, Response } from 'express';

import viewTheResponseRoute from '@routes/viewTheResponse';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('viewTheResponse route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-the-response with oidc middleware', () => {
    viewTheResponseRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-the-response',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should render the view-the-response template', () => {
    viewTheResponseRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('view-the-response');
  });
});
