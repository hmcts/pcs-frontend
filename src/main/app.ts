import * as path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import { glob } from 'glob';
import favicon from 'serve-favicon';

import { HTTPError } from './HttpError';
import { setupDev } from './development';
import * as modules from './modules';
import registerSteps from './routes/registerSteps';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();
app.locals.ENV = env;

const logger = Logger.getLogger('app');

setupDev(app, developmentMode);

app.use(cookieParser());

modules.modules.forEach(async moduleName => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const moduleInstance = new (modules as any)[moduleName](developmentMode);
  await moduleInstance.enableFor(app);
});

app.use(favicon(path.join(__dirname, '/public/assets/images/favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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
