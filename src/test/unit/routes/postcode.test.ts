import postcodeRoutes from '../../../main/routes/postcode';

import axios from 'axios';
import config from 'config';
import express, { Application, Request, Response } from 'express';
import session from 'express-session';
import request from 'supertest';

// Mock external modules
jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: () => ({
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

describe('POST /postcode', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  // codeql[missing-csrf-protection,clear-text-cookie-transmission]: Safe in unit test environment
  beforeEach(() => {
    app = express();
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
      })
    );

    app.use((req, res, next) => {
      req.session.serviceToken = 'test-token';
      next();
    });

    app.use(express.urlencoded({ extended: false }));

    // Intercept res.render
    app.use((req: Request, res: Response, next) => {
      renderSpy = jest.fn((view, options) => {
        res.status(200).send({ view, options });
      });
      res.render = renderSpy as unknown as Response['render'];
      next();
    });

    // Register the routes
    postcodeRoutes(app);
  });

  it('should render postcode view on GET /postcode', async () => {
    await request(app).get('/postcode');
    expect(renderSpy).toHaveBeenCalledWith('postcode', { fields: {} });
  });

  it('should return error if postcode is missing', async () => {
    await request(app).post('/postcode').type('form').send({ postcode: '' });

    expect(renderSpy).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: '',
          errorMessage: 'Please enter a postcode',
        },
      },
    });
  });

  it('should render postcode-result with court data if postcode is valid', async () => {
    const mockCourtData = [{ court_venue_id: '123', court_name: 'Test Court' }];

    (config.get as jest.Mock).mockReturnValue('https://pcs-api-pr-148.preview.platform.hmcts.net');
    (axios.get as jest.Mock).mockResolvedValue({ data: mockCourtData });

    await request(app).post('/postcode').type('form').send({ postcode: 'EC1A 1BB' });

    expect(axios.get).toHaveBeenCalledWith(
      'https://pcs-api-pr-148.preview.platform.hmcts.net/courts?postCode=EC1A%201BB',
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );
    expect(renderSpy).toHaveBeenCalledWith('courts-name', {
      tableRows: [[{ text: '123' }, { text: 'Test Court' }]],
    });
  });

  it('should show error message if API call fails', async () => {
    (config.get as jest.Mock).mockReturnValue('https://pcs-api-pr-148.preview.platform.hmcts.net');
    (axios.get as jest.Mock).mockRejectedValue(new Error('API failed'));

    await request(app).post('/postcode').type('form').send({ postcode: 'EC1A 1BB' });

    expect(renderSpy).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: 'EC1A 1BB',
          errorMessage: 'There was an error retrieving court data. Please try again later.',
        },
      },
    });
  });
});
