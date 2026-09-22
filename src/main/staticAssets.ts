import * as path from 'path';

import express, { type Express, type RequestHandler } from 'express';
import expressStaticGzip from 'express-static-gzip';

const ONE_YEAR = '1y';
const ONE_WEEK = '7d';

// express-static-gzip sets Content-Encoding before it knows whether it will answer, and never
// unsets it, so requests it cannot serve must not reach it.
const onlyPlainBundleReads =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    if (req.path.includes('%') || /\.(?:gz|br)$/i.test(req.path)) {
      return next();
    }
    return handler(req, res, next);
  };

export const setupStaticAssets = (app: Express, publicDir = path.join(__dirname, 'public')): void => {
  const bundles = expressStaticGzip(path.join(publicDir, 'bundles'), {
    index: false,
    serveStatic: { immutable: true, maxAge: ONE_YEAR, index: false, redirect: false },
  });

  app.use('/bundles', onlyPlainBundleReads(bundles));

  app.use(
    '/assets',
    express.static(path.join(publicDir, 'assets'), { maxAge: ONE_WEEK, index: false, redirect: false })
  );

  app.use('/locales', express.static(path.join(publicDir, 'locales'), { index: false, redirect: false }));
};
