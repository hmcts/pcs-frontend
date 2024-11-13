import config from 'config';
import RedisStore from 'connect-redis';
import type { Express } from 'express';
import session from 'express-session';
import { Redis } from 'ioredis';

export class Session {
  enableFor(app: Express): void {
    const redis = new Redis(config.get<string>('secrets.pcs.redis-connection-string'));
    redis.on('error', (err: typeof Error) => console.error('REDIS ERROR', err));
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
