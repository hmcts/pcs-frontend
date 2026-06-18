import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getUserRoles } from '../steps/utils';

interface RoleGatedPath {
  pattern: RegExp;
  allowedRoles: readonly string[];
}

const ROLE_GATED_PATHS: readonly RoleGatedPath[] = [
  {
    pattern: /^\/case\/[^/]+\/respond-to-claim(?:\/.*)?$/,
    allowedRoles: ['citizen', 'caseworker-pcs-solicitor'],
  },
];

export const roleAccessMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const matchedGatedPath = ROLE_GATED_PATHS.find(gatedPath => gatedPath.pattern.test(req.path));
  if (!matchedGatedPath) {
    return next();
  }
  if (!req.session?.user) {
    return next();
  }
  const userRoles = getUserRoles(req);
  const userHasAllowedRole = userRoles.some(userRole => matchedGatedPath.allowedRoles.includes(userRole));
  if (userHasAllowedRole) {
    return next();
  }
  delete req.session.user;
  req.session.save(() => res.redirect('/login'));
};
