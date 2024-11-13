import config from 'config';
import RedisStore from 'connect-redis';
import type { Express } from 'express';
import session from 'express-session';
import { Redis } from 'ioredis';

export class Session {
  enableFor(app: Express): void {
    const redis = new Redis(config.get('secrets.pcs.redis-connection-string'));
    redis.on('error', (err: typeof Error) => console.error('REDIS ERROR', err));
    app.locals.redisClient = redis;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisStore = new (RedisStore as any)({
      client: redis,
      prefix: config.get('session.prefix') + ':',
      ttl: config.get('session.ttlInSeconds'),
    });

    const sessionMiddleware: session.SessionOptions = {
      secret: 'PCS-SECRET', //TODO: replace this
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: 'strict',
        secure: config.get<string>('node-env').toLowerCase() === 'production',
      },
      name: config.get('session.cookieName'),
      store: redisStore,
    };

    app.set('trust proxy', true);
    app.use(session(sessionMiddleware));
  }
}
