import * as path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import { glob } from 'glob';
import favicon from 'serve-favicon';

import { HTTPError } from './HttpError';
import { setupDev } from './development';
import { AppInsights } from './modules/appinsights';
import { Helmet } from './modules/helmet';
import { Nunjucks } from './modules/nunjucks';
import { OIDCModule } from './modules/oidc';
import { PropertiesVolume } from './modules/properties-volume';
import { S2S } from './modules/s2s';
import { Session } from './modules/session';
import registerSteps from './routes/registerSteps';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();
app.locals.ENV = env;

const logger = Logger.getLogger('app');

new PropertiesVolume().enableFor(app);
new AppInsights().enable();
new Nunjucks(developmentMode).enableFor(app);
// secure the application by adding various HTTP headers to its responses
new Helmet(developmentMode).enableFor(app);
new Session().enableFor(app);
new S2S().enableFor(app);
new OIDCModule().enableFor(app);

app.use(favicon(path.join(__dirname, '/public/assets/images/favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

registerSteps(app);

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

setupDev(app, developmentMode);
// returning "not found" page for requests with paths not resolved by the router
app.use((req, res) => {
  res.status(404);
  res.render('not-found');
});

// error handler
app.use((err: HTTPError, req: express.Request, res: express.Response) => {
  logger.error(`${err.stack || err}`);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = env === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
