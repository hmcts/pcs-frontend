import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { enforceRoleAccess, findRuleForPath } from '../access-control';

export const roleAccessMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const matchedRule = findRuleForPath(req.path);
  if (!matchedRule) {
    return next();
  }
  return enforceRoleAccess(req, res, next, matchedRule);
};
