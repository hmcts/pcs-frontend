import config from 'config';
import type { Express } from 'express';
import session from 'express-session';
import { Redis } from 'ioredis';

import RedisStore from 'connect-redis';

const { Logger } = require('@hmcts/nodejs-logging');

export class Session {
  logger = Logger.getLogger('session');
  enableFor(app: Express): void {
    const redisConnectionString = config.get<string>('secrets.pcs.redis-connection-string');
    const redis = new Redis(redisConnectionString);
    redis.on('error', (err: typeof Error) => this.logger.error('REDIS ERROR', err));
    app.locals.redisClient = redis;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisStore = new (RedisStore as any)({
      client: redis,
      prefix: config.get('session.prefix') + ':',
      ttl: config.get('session.ttlInSeconds'),
    });

    const secure = config.get<string>('node-env').toLowerCase() === 'production';

    const sessionMiddleware: session.SessionOptions = {
      secret: config.get<string>('secrets.pcs.pcs-session-secret'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: secure ? 'strict' : 'lax',
        secure,
      },
      name: config.get<string>('session.cookieName'),
      store: redisStore,
    };

    app.set('trust proxy', true);
    app.use(session(sessionMiddleware));
  }
}
