import { randomBytes } from 'crypto';
import type { ServerResponse } from 'http';

import config from 'config';
import * as express from 'express';
import helmet from 'helmet';

const googleAnalyticsDomain = '*.google-analytics.com';
const googleTagManagerDomain = '*.googletagmanager.com';
const self = "'self'";

/**
 * Gives each response a fresh nonce in res.locals.cspNonce. The CSP allows inline scripts carrying it, and the
 * GOV.UK template and the Google Tag Manager snippets put it on their inline scripts.
 */
export const cspNonceMiddleware: express.RequestHandler = (_req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  next();
};

const nonceSource = (_req: unknown, res: ServerResponse): string =>
  `'nonce-${(res as express.Response).locals.cspNonce}'`;

/**
 * The application's security headers, applied before the public routes and the modules so every response has them.
 */
export function securityHeaders(developmentMode: boolean): express.RequestHandler[] {
  // Google Tag Manager and the Google Analytics tags it loads, only when tracking is on (HDPI-8934).
  const trackingEnabled = config.get<boolean>('tracking.enabled');
  const tagManagerSources = trackingEnabled ? [googleTagManagerDomain] : [];

  // include default helmet functions
  const scriptSrc: (string | typeof nonceSource)[] = [self, googleAnalyticsDomain, ...tagManagerSources, nonceSource];

  if (developmentMode) {
    // webpack's development build evaluates strings as JavaScript. Browsers ignore 'unsafe-inline' when the
    // policy has a nonce, so inline scripts need the nonce in development too.
    scriptSrc.push("'unsafe-eval'");
    scriptSrc.push("'unsafe-inline'");
  }

  const formAction = [self];

  const pcqDomain: string = config.get('pcq.url');
  if (pcqDomain) {
    formAction.push(pcqDomain);
  }
  // this is required if user is submitting a form when they need to be logged in
  const idamDomain: string = new URL(config.get('oidc.issuer')).origin;
  if (idamDomain) {
    formAction.push(idamDomain);
  }

  const manageCaseReturnURL: string = new URL(config.get<string>('redirects.manageCaseReturnURL')).origin;
  if (manageCaseReturnURL) {
    formAction.push(manageCaseReturnURL);
  }

  // Required so the browser allows the post-submit 303 redirect out to the CUI Your
  // Support (cui-ra) microsite. form-action is enforced against redirect targets too.
  const cuiRaDomain: string = new URL(config.get<string>('cuiRa.url')).origin;
  if (cuiRaDomain) {
    formAction.push(cuiRaDomain);
  }

  return [
    cspNonceMiddleware,
    helmet({
      contentSecurityPolicy: {
        directives: {
          // As cui-ra, when tracking is on. www.google.com is from HDPI-8934.
          connectSrc: trackingEnabled
            ? [self, googleAnalyticsDomain, googleTagManagerDomain, 'www.google.com']
            : [self],
          defaultSrc: ["'none'"],
          fontSrc: [self, 'data:'],
          imgSrc: [self, googleAnalyticsDomain, ...tagManagerSources],
          objectSrc: [self],
          scriptSrc,
          styleSrc: [self, ...tagManagerSources],
          manifestSrc: [self],
          formAction,
        },
      },
      referrerPolicy: { policy: 'origin' },
    }),
  ];
}
