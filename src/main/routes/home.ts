import config from 'config';
import { Application } from 'express';
import { Redis } from 'ioredis';

export default function (app: Application): void {
  const redis = new Redis(config.get('pcs.redis-connection-string'));
  redis.set('mykey', 'value');
  app.get('/', async (req, res) => {
    const mykey = await redis.get('mykey');
    res.render('home', { connectionString: mykey });
  });
}
