import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getUserRoles } from '../steps/utils';

import { logAccessDenied } from './logging';

export function requireRoles(allowedRoles: readonly string[], ruleName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    delete req.session.user;
    delete req.session.returnTo;
    req.session.save(() => res.redirect('/login'));
  };
}
