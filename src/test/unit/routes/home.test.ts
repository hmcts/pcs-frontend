import request from 'supertest';

import { app } from '../../../main/app';

jest.mock('../../../main/modules/oidc/oidc');

describe('Home page', () => {
  describe('on GET', () => {
    it('should return sample home page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(302);
    });
  });
});
