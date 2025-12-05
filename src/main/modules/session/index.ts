import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import RedisStore from 'connect-redis';
import type { Express } from 'express';
import session from 'express-session';
import { Redis } from 'ioredis';

export class Session {
  logger = Logger.getLogger('session');
  enableFor(app: Express): void {
    const redisConnectionString = config.get<string>('secrets.pcs.redis-connection-string');
    this.logger.info('Connecting to Redis at:', redisConnectionString);

    const redis = new Redis(redisConnectionString);

    redis.on('connect', () => {
      this.logger.info('Successfully connected to Redis');
    });

    redis.on('error', (err: typeof Error) => {
      this.logger.error('REDIS ERROR:', err);
    });

    redis.on('ready', () => {
      this.logger.info('Redis client is ready');
    });

    app.locals.redisClient = redis;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisStore = new (RedisStore as any)({
      client: redis,
      prefix: config.get('session.prefix') + ':',
      ttl: config.get('session.redis.ttlInSeconds'),
    });

    const secure = config.get<string>('node-env').toLowerCase() === 'production';

    const totalIdleTimeMinutes = config.get<number>('session.timeout.totalIdleTime');
    const idleModalDisplayTimeMinutes = config.get<number>('session.timeout.idleModalDisplayTime');

    const sessionMiddleware: session.SessionOptions = {
      secret: config.get<string>('secrets.pcs.pcs-session-secret'),
      resave: false,
      saveUninitialized: false,
      // rolling is an existing express session para, when true it extends the session
      rolling: true,
      cookie: {
        sameSite: secure ? 'strict' : 'lax',
        secure,
        maxAge: totalIdleTimeMinutes * 60 * 1000,
      },
      name: config.get<string>('session.cookieName'),
      store: redisStore,
    };

    app.set('trust proxy', true);
    app.use(session(sessionMiddleware));

    // Make timeout config available to templates
    app.locals.sessionTimeout = {
      idleModalDisplayTime: idleModalDisplayTimeMinutes,
      totalIdleTime: totalIdleTimeMinutes,
    };

    this.logger.info('Session middleware configured with Redis store');
    this.logger.info(
      `Session timeout: ${totalIdleTimeMinutes} minutes, warning at ${idleModalDisplayTimeMinutes} minutes before expiry`
    );
  }
}
