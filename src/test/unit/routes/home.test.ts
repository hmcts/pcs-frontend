import express, { Application, Request, Response } from 'express';
import request from 'supertest';

import homeRoute from '../../../main/routes/home';
import { getRootGreeting } from '../../../main/services/pcsApi/pcsApiService';

interface MockSessionUser {
  given_name?: string;
  family_name?: string;
}

interface MockSession {
  user: MockSessionUser;
}

// Mock the PCS API service
jest.mock('../../../main/services/pcsApi/pcsApiService');

// Mock the middleware (assuming oidcMiddleware is imported from middleware)
jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: (req: Request, res: Response, next: express.NextFunction) => next(),
}));

describe('GET /', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  beforeEach(() => {
    app = express();

    // Middleware to mock res.render and req.session
    app.use((req: Request, res: Response, next) => {
      // Mock session user info (you can customize per test if needed)
      (req.session as unknown as MockSession) = {
        user: {
          given_name: 'zxcv',
          family_name: 'qwer',
        },
      };

      // Mock res.render to capture calls
      renderSpy = jest.fn((view: string, options?: object) => {
        res.status(200).send({ view, options });
      });
      res.render = renderSpy as unknown as Response['render'];

      next();
    });

    // Apply your route
    homeRoute(app);
  });

  it('renders with greeting from API', async () => {
    (getRootGreeting as jest.Mock).mockResolvedValue('Hello from API');

    const response = await request(app).get('/');

    expect(getRootGreeting).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      view: 'home',
      options: expect.objectContaining({
        apiResponse: 'Hello from API',
        givenName: 'zxcv',
        familyName: 'qwer',
        currentTime: expect.any(String),
      }),
    });
  });

  it('renders with default greeting when API call fails', async () => {
    (getRootGreeting as jest.Mock).mockRejectedValue(new Error('API error'));

    const response = await request(app).get('/');

    expect(getRootGreeting).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      view: 'home',
      options: expect.objectContaining({
        apiResponse: 'default value',
        givenName: 'zxcv',
        familyName: 'qwer',
        currentTime: expect.any(String),
      }),
    });
  });

  it('renders with no user session gracefully', async () => {
    // Override session middleware to simulate no user session for this test
    app = express();
    app.use((req, res, next) => {
      // no req.session set here
      renderSpy = jest.fn((view: string, options?: object) => {
        res.status(200).send({ view, options });
      });
      res.render = renderSpy as unknown as Response['render'];
      next();
    });
    homeRoute(app);

    (getRootGreeting as jest.Mock).mockResolvedValue('Hi');

    const response = await request(app).get('/');

    expect(getRootGreeting).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      view: 'home',
      options: expect.objectContaining({
        apiResponse: 'Hi',
        currentTime: expect.any(String),
      }),
    });
  });
});
