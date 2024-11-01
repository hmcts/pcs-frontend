import config from 'config';
import { Application } from 'express';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.render('home', { connectionString: config.get('secrets.pcs.redis-connection-string') });
  });
}
