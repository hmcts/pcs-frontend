import type { NextFunction, Request, Response } from 'express';

import { HTTPError } from '../HttpError';
import { classifyAccess, getUserRoles } from '../steps/utils';

import type { AccessRule } from './accessRules';
import { logAccessDenied } from './logging';
import { sendToLogin } from './sendToLogin';

/**
 * Shared request-time enforcement for a matched access rule.
 *
 * Both the global `roleAccessMiddleware` and the per-route/per-journey
 * `requireRoles` guard delegate here, so the allow / deny (403) / login decision
 * lives in exactly one place.
 *
 * Unauthenticated requests pass through: `oidcMiddleware` (which runs first on
 * every gated route) owns the login redirect.
 */
export function enforceRoleAccess(req: Request, res: Response, next: NextFunction, rule: AccessRule): void {
  if (!req.session?.user) {
    return next();
  }

  const userRoles = getUserRoles(req);
  const classification = classifyAccess(userRoles, rule.allowedRoles);
  if (classification === 'allow') {
    return next();
  }

  logAccessDenied({
    stage: 'request',
    path: req.path,
    userId: typeof req.session.user.uid === 'string' ? req.session.user.uid : undefined,
    userRoles,
    rule,
  });

  if (classification === 'deny') {
    return next(new HTTPError('Access denied', 403));
  }
  return sendToLogin(req, res);
}
