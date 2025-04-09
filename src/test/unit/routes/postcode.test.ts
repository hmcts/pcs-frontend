import postcodeRoutes from '../../../main/routes/postcode';

import axios from 'axios';
import config from 'config';
import express, { Application, Request, Response } from 'express';
import request from 'supertest';

jest.mock('axios');
jest.mock('config');

describe('POST /postcode', () => {
  let app: Application;
  let renderSpy: jest.Mock;

  beforeEach(() => {
    app = express();

    // Parse URL-encoded body before route is registered
    app.use(express.urlencoded({ extended: false }));

    // Mock res.render and auto-end the response
    app.use((req: Request, res: Response, next) => {
      renderSpy = jest.fn((view, options) => {
        res.status(200).send({ view, options });
      });
      res.render = renderSpy as unknown as Response['render'];
      next();
    });

    // Register the actual route
    postcodeRoutes(app);
  });

  it('should return error if postcode is missing', async () => {
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

  it('should render result if postcode is valid and API responds', async () => {
    (config.get as jest.Mock).mockReturnValue('http://mock-api');
    (axios.get as jest.Mock).mockResolvedValue({
      data: { courtName: 'Mock Court' },
    });

    const response = await request(app).post('/postcode').type('form').send({ postcode: 'SW1A 1AA' });

    expect(axios.get).toHaveBeenCalledWith('http://mock-api/courts?postCode=SW1A%201AA');

    expect(renderSpy).toHaveBeenCalledWith('postcode-result', {
      courtData: { courtName: 'Mock Court' },
    });

    expect(response.status).toBe(200);
  });
});
