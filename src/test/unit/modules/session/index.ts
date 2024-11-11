import { Session } from '../../../../main/modules/session';

import type { Express } from 'express';

describe('Session', () => {
  test('should initialise session', async () => {
    jest.mock('connect-redis');
    jest.mock('express-session');
    jest.mock('ioredis');
    jest.mock('config', () => ({
      get: jest.fn(() => 'production'),
    }));

    const app = {
      use: jest.fn(),
      listen: jest.fn(),
    };
    jest.doMock('express', () => {
      return () => {
        return app;
      };
    });

    new Session().enableFor(app as unknown as Express);
    expect(app.use).toHaveBeenCalled();
  });
});
