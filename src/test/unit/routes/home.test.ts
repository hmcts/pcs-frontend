import { Application } from 'express';

//import { oidcMiddleware } from '../../../main/middleware';
import homeRoute from '../../../main/routes/home';

describe('Home Route', () => {
  let mockApp: Application;
  let mockGet: jest.Mock;
  let mockRender: jest.Mock;

  let mockReq: {
    session?: {
      user?: unknown;
    };
  };

  let mockRes: {
    render: jest.Mock;
    redirect: jest.Mock;
  };

  let mockNext: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();

    mockApp = {
      get: mockGet,
    } as unknown as Application;

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should register the home route', () => {
    homeRoute(mockApp);

    expect(mockGet).toHaveBeenCalledWith(
      '/',
      expect.any(Function), // oidcMiddleware
      expect.any(Function)
    );
  });

  describe('GET /', () => {
    let userName: string;

    beforeEach(() => {
      mockReq = {
        session: {
          user: { given_name: 'Danyaal' }, // Add mock user to session to pass oidcMiddleware
        },
      };

      userName = (mockReq.session?.user as { given_name: string }).given_name;

      mockRender = jest.fn();

      mockRes = {
        render: mockRender,
        redirect: jest.fn(),
      };

      mockNext = jest.fn();
    });

    //load home route, skipping login and using mock user data instead
    const loadHomeRoute = async () => {
      homeRoute(mockApp);

      const routeHandler = mockGet.mock.calls[0][2]; // Changed index to 2 to get the route handler after middleware
      await routeHandler(mockReq, mockRes, mockNext);
    };

    it('should render the home page with the landing greeting', async () => {
      const landingGreeting: string = `${userName} ${new Date().toDateString()}`;

      await loadHomeRoute();

      const compareRenderedGreeting = mockRes.render.mock.calls[0][1].landingGreeting;

      expect(compareRenderedGreeting).toEqual(landingGreeting);
    });

    it('should render the correct username on the landing greeting', async () => {
      await loadHomeRoute();

      const compareRenderedGreeting = mockRes.render.mock.calls[0][1].landingGreeting;

      expect(compareRenderedGreeting).toContain(`${userName}`);
    });

    it('should render the correct date on the landing greeting', async () => {
      await loadHomeRoute();

      const compareRenderedGreeting = mockRes.render.mock.calls[0][1].landingGreeting;
      const currentDate = new Date().toDateString();

      expect(compareRenderedGreeting).toContain(currentDate);
    });
  });
});
