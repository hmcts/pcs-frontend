import type { AccessRule } from './accessRules';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('access-control');

export type AccessDenialStage = 'login' | 'request';

export interface AccessDenialContext {
  stage: AccessDenialStage;
  path: string;
  userId?: string;
  userRoles: readonly string[];
  rule: AccessRule;
}

export function logAccessDenied(ctx: AccessDenialContext): void {
  logger.warn('Access denied', {
    event: 'access_denied',
    stage: ctx.stage,
    rule: ctx.rule.name,
    path: ctx.path,
    userId: ctx.userId,
    userRoles: ctx.userRoles,
    requiredRoles: ctx.rule.allowedRoles,
  });
}
