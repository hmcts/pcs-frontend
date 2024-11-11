// import config from 'config';
// import RedisStore from 'connect-redis';
import { Session } from '../../../../main/modules/session';

import type { Express } from 'express';
// import session from 'express-session';
// import { Redis } from 'ioredis';

describe('Session', () => {
  jest.mock('connect-redis');
  jest.mock('express-session');
  jest.mock('ioredis');

  test('should initialise session', async () => {
    const app = {
      use: jest.fn(),
      listen: jest.fn(),
    };
    jest.doMock('express', () => {
      return () => {
        return app;
      };
    });

    const config = {
      get: () => 'production',
    };
    jest.doMock('config', () => {
      return () => {
        return config;
      };
    });

    new Session().enableFor(app as unknown as Express);
    expect(app.use).toHaveBeenCalled();
  });
});
