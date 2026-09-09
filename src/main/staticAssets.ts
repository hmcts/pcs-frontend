import { type ServerResponse } from 'http';
import * as path from 'path';

import express, { type Express, type RequestHandler } from 'express';
import expressStaticGzip from 'express-static-gzip';

const ONE_YEAR_IN_SECONDS = 31536000;

export const IMMUTABLE_CACHE_CONTROL = `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`;
export const REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

const FINGERPRINTED_ASSET =
  /(?:\.[0-9a-f]{16,}\.(?:js|css)(?:\.LICENSE\.txt)?|-[0-9a-f]{8,}-v\d+\.(?:woff2?|ttf|eot))(?:\.br|\.gz)?$/;

export const isFingerprintedAsset = (filePath: string): boolean => FINGERPRINTED_ASSET.test(filePath);

const setAssetHeaders = (res: ServerResponse, filePath: string): void => {
  res.setHeader('Cache-Control', isFingerprintedAsset(filePath) ? IMMUTABLE_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
};

export const buildAssetHandler = (root: string): RequestHandler =>
  expressStaticGzip(root, { serveStatic: { setHeaders: setAssetHeaders } });

export const setupStaticAssets = (app: Express): void => {
  app.use(buildAssetHandler(path.join(__dirname, 'public')));

  const cftStylesPath = path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/styles/ui-component-lib.css'));
  app.use('/assets/ui-component-lib', express.static(cftStylesPath, { setHeaders: setAssetHeaders }));
};
