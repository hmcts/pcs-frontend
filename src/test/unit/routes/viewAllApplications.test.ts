import type { Application, Request, Response } from 'express';

<<<<<<< HDPI-5710
import { VIEW_ALL_APPLICATIONS_ROUTE } from '../../../main/constants/caseRoutes';

=======
>>>>>>> HDPI-5549
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

<<<<<<< HDPI-5710
    expect(app.get).toHaveBeenCalledWith(VIEW_ALL_APPLICATIONS_ROUTE, expect.any(Function), expect.any(Function));
=======
    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-all-applications',
      expect.any(Function),
      expect.any(Function)
    );
>>>>>>> HDPI-5549
  });

  it('should render the view-all-applications template', () => {
    viewAllApplicationsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

<<<<<<< HDPI-5710
    expect(res.render).toHaveBeenCalledWith('view-all-applications', { dashboardUrl: null });
=======
    expect(res.render).toHaveBeenCalledWith('view-all-applications');
>>>>>>> HDPI-5549
  });
});
