import type { RequestHandler } from 'express';

import type { AccessRule } from './accessRules';
import { enforceRoleAccess } from './enforceRoleAccess';

export function requireRoles(allowedRoles: readonly string[], ruleName: string): RequestHandler {
  const rule: AccessRule = { name: ruleName, pathPattern: /.*/, allowedRoles };
  return (req, res, next) => enforceRoleAccess(req, res, next, rule);
}
