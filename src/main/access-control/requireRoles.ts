import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { classifyAccess, getUserRoles } from '../steps/utils';

import { logAccessDenied } from './logging';
import { sendToLogin } from './sendToLogin';

export function requireRoles(allowedRoles: readonly string[], ruleName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      // Unauthenticated: oidcMiddleware (which runs first) owns the login redirect.
      return next();
    }

    const userRoles = getUserRoles(req);
    const classification = classifyAccess(userRoles, allowedRoles);
    if (classification === 'allow') {
      return next();
    }

    logAccessDenied({
      stage: 'request',
      path: req.path,
      userId: typeof req.session.user.uid === 'string' ? req.session.user.uid : undefined,
      userRoles,
      rule: { name: ruleName, pathPattern: /.*/, allowedRoles },
    });

    if (classification === 'deny') {
      return next(new HTTPError('Access denied', 403));
    }
    return sendToLogin(req, res);
  };
}
