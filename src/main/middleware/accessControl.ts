import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { legalrepFlowConfig } from '../steps/respond-to-claim/legalrep.flow.config';
import { getUserType } from '../steps/utils';

import { oidcMiddleware } from './oidc';

export const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/login\/?$/,
  /^\/oauth2\/callback\/?$/,
  /^\/logout\/?$/,
  /^\/active\/?$/,
  /^\/health(?:\/.*)?$/,
  /^\/info\/?$/,
];

export const SOLICITOR_ALLOWED_STEP_SLUGS = new Set<string>(legalrepFlowConfig.stepOrder ?? []);

export const SOLICITOR_ALLOWED_PLUMBING_PATHS: RegExp[] = [
  /^\/api\/postcode-lookup(?:\/.*)?$/,
  /^\/case\/[^/]+\/respond-to-claim\/upload-document\/(?:upload|delete|document\/[^/]+)\/?$/,
  /^\/case\/[^/]+\/final-submit\/?$/,
];

const RESPOND_TO_CLAIM_STEP_PATTERN = /^\/case\/[^/]+\/respond-to-claim(?:\/([^/]+))?\/?$/;

export const isPublicPath = (path: string): boolean => PUBLIC_PATHS.some(pattern => pattern.test(path));

export const isSolicitorAllowedPath = (path: string): boolean => {
  if (SOLICITOR_ALLOWED_PLUMBING_PATHS.some(pattern => pattern.test(path))) {
    return true;
  }

  const match = RESPOND_TO_CLAIM_STEP_PATTERN.exec(path);
  if (!match) {
    return false;
  }

  const stepSlug = match[1];
  return !stepSlug || SOLICITOR_ALLOWED_STEP_SLUGS.has(stepSlug);
};

export const authenticationGate: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (isPublicPath(req.path)) {
    return next();
  }

  return void oidcMiddleware(req, res, next);
};

export const authorisationGate: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (isPublicPath(req.path)) {
    return next();
  }

  const userType = getUserType(req);

  if (userType === 'citizen') {
    return next();
  }

  if (userType === 'legalrep') {
    if (isSolicitorAllowedPath(req.path)) {
      return next();
    }
    return next(new HTTPError('Access denied', 403));
  }

  res.redirect('/logout');
};
