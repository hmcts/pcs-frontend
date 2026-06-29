import {
  CITIZEN_USER_ROLES,
  LEGAL_REPRESENTATIVE_USER_ROLES,
  ROLE_CITIZEN,
  ROLE_PCS_SOLICITOR,
} from '../steps/utils/userRole';

export interface AccessRule {
  readonly name: string;
  readonly pathPattern: RegExp;
  readonly allowedRoles: readonly string[];
}

export const accessRules: readonly AccessRule[] = [
  {
    name: 'respond-to-claim',
    pathPattern: /^\/case\/[^/]+\/respond-to-claim(?:\/.*)?$/,
    allowedRoles: [...CITIZEN_USER_ROLES, ...LEGAL_REPRESENTATIVE_USER_ROLES],
  },
  {
    name: 'dashboard',
    pathPattern: /^\/case\/[^/]+\/dashboard(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'make-an-application',
    pathPattern: /^\/case\/[^/]+\/make-an-application(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'claims',
    pathPattern: /^\/claims(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'access-your-case',
    pathPattern: /^\/access-your-case(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
];

export function findRuleForPath(path: string): AccessRule | undefined {
  return accessRules.find(rule => rule.pathPattern.test(path));
}

export function userMayAccessPath(userRoles: readonly string[], path: string): boolean {
  const rule = findRuleForPath(path);
  if (!rule) {
    return true;
  }
  return userRoles.some(role => rule.allowedRoles.includes(role));
}

export type LoginAccessDecision = { allowed: true } | { allowed: false; rule: AccessRule };

export function evaluateLoginAccess(returnTo: string | undefined, userRoles: readonly string[]): LoginAccessDecision {
  if (!returnTo) {
    return { allowed: true };
  }
  const rule = findRuleForPath(returnTo);
  if (!rule) {
    return { allowed: true };
  }
  if (userRoles.some(role => rule.allowedRoles.includes(role))) {
    return { allowed: true };
  }
  return { allowed: false, rule };
}

export { ROLE_CITIZEN, ROLE_PCS_SOLICITOR };
