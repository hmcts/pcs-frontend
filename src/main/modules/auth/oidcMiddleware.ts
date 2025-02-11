import { CALLBACK_URL, SIGN_IN_URL } from '../../steps/urls';

import { getRedirectUrl } from './index';

import config from 'config';
import { Application } from 'express';

export class OidcMiddleware {
  public enableFor(app: Application): void {
    const protocol: string = app.locals.developmentMode ? 'http://' : 'https://';
    const port: string = app.locals.developmentMode ? `:${config.get('port')}` : '';

    app.get(SIGN_IN_URL, (req, res) =>
      res.redirect(getRedirectUrl(`${protocol}${res.locals.host}${port}`, CALLBACK_URL))
    );

    app.get(CALLBACK_URL, (req, res) => {
      res.redirect(getRedirectUrl(`${protocol}${res.locals.host}${port}`, SIGN_IN_URL));
    });
  }
}
