import * as path from 'path';

import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import { glob } from 'glob';
import favicon from 'serve-favicon';

import { setupDev } from './development';
import { sessionTimeoutMiddleware } from './middleware';
import * as modules from './modules';
import registerSteps from './routes/registerSteps';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();

app.locals.ENV = env;

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

// timeout config available to all templates
app.use(sessionTimeoutMiddleware);

registerSteps(app);

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

// Note: Error handlers are set up in server.ts AFTER NestJS bootstrap
// This ensures NestJS routes are registered before the 404 catch-all handler
