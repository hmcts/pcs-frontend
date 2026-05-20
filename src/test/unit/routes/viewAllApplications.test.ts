import type { Application, Request, Response } from 'express';

import { VIEW_ALL_APPLICATIONS_ROUTE } from '../../../main/constants/caseRoutes';

import viewAllApplicationsRoute from '@routes/viewAllApplications';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('viewAllApplications route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-all-applications with oidc middleware', () => {
    viewAllApplicationsRoute(app);

    expect(app.get).toHaveBeenCalledWith(VIEW_ALL_APPLICATIONS_ROUTE, expect.any(Function), expect.any(Function));
  });

  it('should render the view-all-applications template', () => {
    viewAllApplicationsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('view-all-applications', { dashboardUrl: null });
  });
});
