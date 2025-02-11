import { OidcMiddleware } from '../../../../main/modules/auth/oidcMiddleware';
import { CALLBACK_URL, SIGN_IN_URL } from '../../../../main/steps/urls';

import config from 'config';
import express from 'express';
import request from 'supertest';

jest.mock('config');

describe('OidcMiddleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.locals.developmentMode = true;
    app.locals.host = 'localhost';
    app.locals.errorHandler = (fn: express.RequestHandler) => fn;
    new OidcMiddleware().enableFor(app);
  });

  it('should redirect to the correct URL on sign-in', async () => {
    (config.get as jest.Mock).mockReturnValueOnce('3000');
    const response = await request(app).get(SIGN_IN_URL);
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('http://localhost:3000/callback');
  });

  it('should redirect to sign-in URL on callback', async () => {
    const response = await request(app).get(CALLBACK_URL);
    expect(response.status).toBe(302);
    expect(response.header.location).toBe(SIGN_IN_URL);
  });
});
