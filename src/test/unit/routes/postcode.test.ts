import axios from 'axios';
import config from 'config';
import express, { Application, Request, Response } from 'express';
import request from 'supertest';

import postcodeRoutes from '../../../main/routes/postcode';

<<<<<<< HEAD
jest.mock('axios');
jest.mock('config');
=======
interface MockSession {
  user: {
    accessToken: string;
  };
}

// Mock external modules
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
>>>>>>> e401a8b (HDPI-515: fixing the authorization issue after merging from master)

describe('POST /postcode', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: false }));

    // Mock res.render
    app.use((req: Request, res: Response, next) => {
      // Mock session
      (req.session as unknown as MockSession) = {
        user: {
          accessToken: 'test-token',
        },
      };

      renderSpy = jest.fn((view, options) => {
        res.status(200).send({ view, options });
      });
      res.render = renderSpy as unknown as Response['render'];
      next();
    });

    postcodeRoutes(app);
  });

  it('should render an error if postcode is missing', async () => {
    const response = await request(app).post('/postcode').type('form').send({ postcode: '' });

    expect(renderSpy).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: '',
          errorMessage: 'Please enter a postcode',
        },
      },
    });

    expect(response.status).toBe(200);
  });

<<<<<<< HEAD
  it('should render postcode-result with court data if postcode is valid', async () => {
    const mockAccessToken = 'test-access-token';
    const mockCourtData = [{ id: '123', name: 'Test Court' }];

    // Mock config values
    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        'idam.url': 'http://mock-idam',
        oidc: JSON.stringify({
          redirectUri: 'http://localhost/redirect',
          clientId: 'test-client-id',
        }),
        'secrets.pcs.idam-system-user-name': 'user',
        'secrets.pcs.idam-system-user-password': 'pass',
        'secrets.pcs.pcs-frontend-idam-secret': 'secret',
        'api.url': 'http://mock-pcs',
      };
      return typeof configMap[key] === 'string' ? configMap[key] : JSON.parse(configMap[key]);
    });

    // Mock IDAM token response
    (axios.post as jest.Mock).mockResolvedValue({
      data: { access_token: mockAccessToken },
    });

    // Mock PCS API response
    (axios.get as jest.Mock).mockResolvedValue({
      data: mockCourtData,
    });

    const response = await request(app).post('/postcode').type('form').send({ postcode: 'EC1A 1BB' });

    expect(axios.post).toHaveBeenCalledWith('http://mock-idam/o/token', expect.any(URLSearchParams), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    expect(axios.get).toHaveBeenCalledWith('http://mock-pcs/courts?postcode=EC1A%201BB', {
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(renderSpy).toHaveBeenCalledWith('courts-name', {
      tableRows: [[{ text: '123' }, { text: 'Test Court' }]],
    });

    expect(response.status).toBe(200);
  });

  it('should render error page if IDAM or PCS API fails', async () => {
    (config.get as jest.Mock).mockReturnValue('http://mock-idam');

    // Force token call to fail
    (axios.post as jest.Mock).mockRejectedValue(new Error('IDAM error'));
=======
  it('should show error message if PCS API call fails', async () => {
    (getCourtVenues as jest.Mock).mockRejectedValue(new Error('API failed'));
>>>>>>> 789500f (HDPI-515: refactoring and tidying up)

    const response = await request(app).post('/postcode').type('form').send({ postcode: 'EC1A 1BB' });

    expect(renderSpy).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: 'EC1A 1BB',
          errorMessage: 'There was an error retrieving court data. Please try again later.',
        },
      },
    });

    expect(response.status).toBe(200);
  });

  it('should render courts.njk with tableRows if PCS API returns data', async () => {
    (getCourtVenues as jest.Mock).mockResolvedValue([{ epimId: 123, id: 456, name: 'Test Court' }]);

    const response = await request(app).post('/postcode').type('form').send({ postcode: 'SW1A 1AA' });

    expect(getCourtVenues).toHaveBeenCalledWith('SW1A 1AA', 'mocked-access-token');

    expect(renderSpy).toHaveBeenCalledWith('courts.njk', {
      tableRows: [[{ text: '456' }, { text: 'Test Court' }]],
    });

    expect(response.status).toBe(200);
  });
});
