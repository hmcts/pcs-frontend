import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { findRuleForPath, logAccessDenied } from '../access-control';
import { getUserRoles } from '../steps/utils';

export const roleAccessMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const matchedRule = findRuleForPath(req.path);
  if (!matchedRule) {
    return next();
  }
  if (!req.session?.user) {
    return next();
  }
  const userRoles = getUserRoles(req);
  const userHasAllowedRole = userRoles.some(userRole => matchedRule.allowedRoles.includes(userRole));
  if (userHasAllowedRole) {
    return next();
  }

  logAccessDenied({
    stage: 'request',
    path: req.path,
    userId: typeof req.session.user.uid === 'string' ? req.session.user.uid : undefined,
    userRoles,
    rule: matchedRule,
  });

  next(new HTTPError('Access denied', 403));
};
