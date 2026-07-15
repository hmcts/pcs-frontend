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
    name: 'upload-additional-documents',
    pathPattern: /^\/case\/[^/]+\/upload-additional-documents(?:\/.*)?$/,
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
  {
    name: 'view-the-claim',
    pathPattern: /^\/case\/[^/]+\/view-the-claim(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'view-documents',
    pathPattern: /^\/case\/[^/]+\/view-documents(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'view-hearing-documents',
    pathPattern: /^\/case\/[^/]+\/view-hearing-documents(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'view-orders-and-notices',
    pathPattern: /^\/case\/[^/]+\/view-orders-and-notices(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
  {
    name: 'view-all-applications',
    pathPattern: /^\/case\/[^/]+\/view-all-applications(?:\/.*)?$/,
    allowedRoles: CITIZEN_USER_ROLES,
  },
];

export function findRuleForPath(path: string): AccessRule | undefined {
  return accessRules.find(rule => rule.pathPattern.test(path));
}

export function rolesForRule(name: string): readonly string[] {
  const rule = accessRules.find(r => r.name === name);
  if (!rule) {
    const available = accessRules.map(r => r.name).join(', ');
    throw new Error(`No accessRule named '${name}'. Available rules: ${available}`);
  }
  return rule.allowedRoles;
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
