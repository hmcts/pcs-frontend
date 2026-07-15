import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { findRuleForPath, logAccessDenied, sendToLogin } from '../access-control';
import { classifyAccess, getUserRoles } from '../steps/utils';

export const roleAccessMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const matchedRule = findRuleForPath(req.path);
  if (!matchedRule) {
    return next();
  }
  if (!req.session?.user) {
    return next();
  }

  const userRoles = getUserRoles(req);
  const classification = classifyAccess(userRoles, matchedRule.allowedRoles);
  if (classification === 'allow') {
    return next();
  }

  logAccessDenied({
    stage: 'request',
    path: req.path,
    userId: typeof req.session.user.uid === 'string' ? req.session.user.uid : undefined,
    userRoles,
    rule: matchedRule,
  });

  if (classification === 'deny') {
    return next(new HTTPError('Access denied', 403));
  }
  return sendToLogin(req, res);
};
