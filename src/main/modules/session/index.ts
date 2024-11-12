import config from 'config';
import RedisStore from 'connect-redis';
import type { Express } from 'express';
import session from 'express-session';
import { Redis } from 'ioredis';

export class Session {
  enableFor(app: Express): void {
    const sessionMiddleware: session.SessionOptions = {
      secret: 'PCS-SECRET', //TODO: replace this
      resave: false,
      saveUninitialized: true,
      cookie: { sameSite: 'strict' },
      name: config.get('session.cookieName'),
    };

    const redis = new Redis(config.get('secrets.pcs.redis-connection-string'));
    console.log('conn str = ', config.get('secrets.pcs.redis-connection-string'), process.env.REDIS_CLOUD_URL);
    redis.on('error', (err: Error) => console.error('REDIS ERROR', err));
    app.locals.redisClient = redis;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisStore = new (RedisStore as any)({
      client: redis,
      prefix: config.get('session.prefix') + ':',
      ttl: config.get('session.ttlInSeconds'),
    });
    sessionMiddleware.store = redisStore;

    //if (config.get('node-env') === 'production' && sessionMiddleware.cookie) {
    if (config.get('node-env').toLowerCase() === 'production' && sessionMiddleware.cookie) {
      sessionMiddleware.cookie.secure = true; // serve secure cookies
    }

    app.use(session(sessionMiddleware));
  }
}
