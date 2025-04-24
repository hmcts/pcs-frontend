import express, { Application, Request, Response } from 'express';
import request from 'supertest';

import postcodeRoutes from '../../../main/routes/postcode';
import { getCourtVenues } from '../../../main/services/pcsApi/pcsApiService';

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

describe('POST /postcode', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.urlencoded({ extended: false }));

    // Mock res.render
    app.use((req: Request, res: Response, next) => {
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

  it('should show error message if PCS API call fails', async () => {
    (getCourtVenues as jest.Mock).mockRejectedValue(new Error('API failed'));

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

    expect(getCourtVenues).toHaveBeenCalledWith('SW1A 1AA');

    expect(renderSpy).toHaveBeenCalledWith('courts.njk', {
      tableRows: [[{ text: '456' }, { text: 'Test Court' }]],
    });

    expect(response.status).toBe(200);
  });
});
