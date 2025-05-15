import express, { Application, Request, Response } from 'express';
import request from 'supertest';

import homeRoutes from '../../../main/routes/home';
import { getRootGreeting } from '../../../main/services/pcsApi/pcsApiService';

// --- Mock external services and logging --- //
jest.mock('../../../main/services/pcsApi/pcsApiService');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: () => ({
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

// Interface for mocked session data
interface MockSession {
  user: {
    given_name: string;
    family_name: string;
  };
}

describe('GET /', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  beforeEach(() => {
    app = express();

    // --- Middleware to mock session and res.render --- //
    app.use((req: Request, res: Response, next) => {
      // Simulate logged-in user in session
      (req.session as unknown as MockSession) = {
        user: {
          given_name: 'zxcv',
          family_name: 'bnml',
        },
      };

      // Spy on res.render to intercept view and data
      renderSpy = jest.fn((view, options) => {
        res.status(200).send({ view, options }); // Send view data as response for testing
      });

      res.render = renderSpy as unknown as Response['render'];
      next();
    });

    // Register the route
    homeRoutes(app);
  });

  it('should render the home page with expected template and values', async () => {
    // Mock successful API response
    (getRootGreeting as jest.Mock).mockResolvedValue('Hello from PCS');

    // Perform the GET request
    const response = await request(app).get('/');

    // Check HTTP status
    expect(response.status).toBe(200);

    // Ensure correct template and values are passed to res.render
    expect(renderSpy).toHaveBeenCalledWith(
      'home',
      expect.objectContaining({
        givenName: 'zxcv',
        familyName: 'bnml',
        apiResponse: 'Hello from PCS',
      })
    );

    // Check if currentTime is in the expected string format
    const options = renderSpy.mock.calls[0][1];
    expect(typeof options.currentTime).toBe('string');
    expect(options.currentTime).toMatch(/\d{2}:\d{2}/);
    expect(options.currentTime).toMatch(/\d{4}/);
  });

  it('should show default apiResponse if the API call fails', async () => {
    // Mock failure from the API call
    (getRootGreeting as jest.Mock).mockRejectedValue(new Error('API Down'));

    // GET request
    const response = await request(app).get('/');

    // Check HTTP status
    expect(response.status).toBe(200);

    // Ensure fallback default value is used
    expect(renderSpy).toHaveBeenCalledWith(
      'home',
      expect.objectContaining({
        apiResponse: 'default value',
        givenName: 'zxcv',
        familyName: 'bnml',
      })
    );
  });
});
