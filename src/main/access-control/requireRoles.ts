import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { getUserRoles } from '../steps/utils';

import { logAccessDenied } from './logging';

export function requireRoles(allowedRoles: readonly string[], ruleName: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      return next();
    }
    const userRoles = getUserRoles(req);
    if (userRoles.some(role => allowedRoles.includes(role))) {
      return next();
    }

    logAccessDenied({
      stage: 'request',
      path: req.path,
      userId: typeof req.session.user.uid === 'string' ? req.session.user.uid : undefined,
      userRoles,
      rule: { name: ruleName, pathPattern: /.*/, allowedRoles },
    });

    next(new HTTPError('Access denied', 403));
  };
}
