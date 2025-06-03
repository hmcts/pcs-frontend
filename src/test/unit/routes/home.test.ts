import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../../main/app';

/* eslint-disable jest/expect-expect */
describe('Home page', () => {
  describe('on GET', () => {
    test('should return sample home page', async () => {
      await request(app)
        .get('/')
        .expect(res => expect(res.status).to.equal(200));
    });
  });
});
