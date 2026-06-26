import type { Request } from 'express';

export const ROLE_CITIZEN = 'citizen';
export const ROLE_PCS_SOLICITOR = 'caseworker-pcs-solicitor';

export const CITIZEN_USER_ROLES = [ROLE_CITIZEN] as const;
export const LEGAL_REPRESENTATIVE_USER_ROLES = [ROLE_PCS_SOLICITOR] as const;

export type UserType = 'citizen' | 'legalrep';

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

export function isCitizenUser(req: Request): boolean {
  return getUserRoles(req).some(role => CITIZEN_USER_ROLES.includes(role as (typeof CITIZEN_USER_ROLES)[number]));
}

export function isLegalRepresentativeUser(req: Request): boolean {
  return getUserRoles(req).some(role =>
    LEGAL_REPRESENTATIVE_USER_ROLES.includes(role as (typeof LEGAL_REPRESENTATIVE_USER_ROLES)[number])
  );
}

export function getUserType(req: Request): UserType {
  if (isLegalRepresentativeUser(req)) {
    return 'legalrep';
  }

  return 'citizen';
}

export function getUserToken(req: Request): string {
  const token = req.session?.user?.accessToken;
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
}
