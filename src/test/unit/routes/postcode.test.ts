import express, { Application, Request, Response } from 'express';
import request from 'supertest';

import postcodeRoutes from '../../../main/routes/postcode';

// Mock external modules
const mockGetCourtVenues = jest.fn();
jest.mock('../../../main/modules/pcs-api-client', () => {
  return {
    PcsApiClient: jest.fn().mockImplementation(() => {
      return { getCourtVenues: mockGetCourtVenues };
    }),
  };
});

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

  beforeEach(() => {
    app = express();
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

  it('should render postcode-result with court data if PCS API call succeeds', async () => {
    const mockCourtData = [{ court_venue_id: '123', court_name: 'Test Court' }];
    mockGetCourtVenues.mockResolvedValue(mockCourtData);

    await request(app).post('/postcode').type('form').send({ postcode: 'EC1A 1BB' });

    expect(renderSpy).toHaveBeenCalledWith('postcode-result', {
      courtData: mockCourtData,
    });
  });

  it('should show error message if PCS API call fails', async () => {
    mockGetCourtVenues.mockRejectedValue(new Error('API failed'));

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

  it('should render postcode view on GET /postcode', async () => {
    await request(app).get('/postcode');
    expect(renderSpy).toHaveBeenCalledWith('postcode', { fields: {} });
  });
});
