import config from 'config';
import { Application, Request, Response } from 'express';

export default function (app: Application): void {
  app.get('/active', (req: Request, res: Response) => {
    // check session exists
    if (!req.session || !req.session.cookie) {
      return res.status(401).send('No active session');
    }

    // extend session cookie
    const sessionTimeoutMinutes = config.get<number>('session.timeout.sessionTimeoutMinutes');
    const maxAgeMilliseconds = sessionTimeoutMinutes * 60 * 1000;

    req.session.cookie.expires = new Date(Date.now() + maxAgeMilliseconds);
    req.session.cookie.maxAge = maxAgeMilliseconds;

    // save session
    req.session.save(err => {
      if (err) {
        return res.status(500).send('Failed to extend session');
      }
      res.status(200).send('Session extended');
    });
  });
}
