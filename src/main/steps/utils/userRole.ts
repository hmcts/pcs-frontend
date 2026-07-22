import type { Request } from 'express';

export const CITIZEN_USER_ROLES = ['citizen'] as const;
export const LEGAL_REPRESENTATIVE_USER_ROLES = ['caseworker-pcs-solicitor'] as const;
export const ALLOWED_USER_ROLES = [...CITIZEN_USER_ROLES, ...LEGAL_REPRESENTATIVE_USER_ROLES] as const;

export type UserType = 'citizen' | 'legalrep' | 'unauthorised';

export function normaliseRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .filter((role): role is string => typeof role === 'string')
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
}

export function getUserRoles(req: Request): string[] {
  return normaliseRoles(req.session?.user?.roles);
}

function hasRole(roles: string[], allowed: readonly string[]): boolean {
  return roles.some(role => allowed.includes(role));
}

export function hasAllowedUserRole(roles: string[]): boolean {
  return hasRole(roles, ALLOWED_USER_ROLES);
}

export function isCitizenUser(req: Request): boolean {
  return hasRole(getUserRoles(req), CITIZEN_USER_ROLES);
}

export function isLegalRepresentativeUser(req: Request): boolean {
  return hasRole(getUserRoles(req), LEGAL_REPRESENTATIVE_USER_ROLES);
}

export function getUserType(req: Request): UserType {
  const roles = getUserRoles(req);

  if (hasRole(roles, LEGAL_REPRESENTATIVE_USER_ROLES)) {
    return 'legalrep';
  }

  if (hasRole(roles, CITIZEN_USER_ROLES)) {
    return 'citizen';
  }

  return 'unauthorised';
}

export function getUserToken(req: Request): string {
  const token = req.session?.user?.accessToken;
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
}
