// import config from 'config';
import { Application } from 'express';
// import { Redis } from 'ioredis';

export default async function (app: Application): Promise<void> {
  app.get('/', async (req, res) => {
    /* let logMsg = '';
    if (!app.locals.redis) {
      try {
        app.locals.redis = new Redis(config.get('pcs.redis-connection-string'), {
          maxRetriesPerRequest: 3,
        });
        await app.locals.redis.set('mykey', 'value');
      } catch (error) {
        logMsg = `${error.message} - Unable to connect and Set to redis`;
        app.locals.redis.disconnect();
      }
    }

    try {
      const val = await app.locals.redis.get('mykey');
      logMsg += ` - value: ${val}`;
    } catch (err) {
      logMsg += ` ${err.message} - unable to get my key`;
    } */
    res.render('home');
  });
}
