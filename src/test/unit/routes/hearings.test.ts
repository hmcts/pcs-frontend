import type { Application, Request, Response } from 'express';

import hearingsRoute from '@routes/hearings';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('hearings route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-hearing-documents with oidc middleware', () => {
    hearingsRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-hearing-documents',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should render the view-hearing-documents template', () => {
    hearingsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('view-hearing-documents');
  });
});
