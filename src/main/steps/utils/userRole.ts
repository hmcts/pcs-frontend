import type { Request } from 'express';

export const LEGAL_REPRESENTATIVE_USER_ROLES = ['solicitor'] as const;

export type UserType = 'citizen' | 'legalrep';

export function getUserRoles(req: Request): string[] {
  const roles = req.session?.user?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .filter((role): role is string => typeof role === 'string')
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
}

export function isLegalRepresentativeUser(req: Request): boolean {
  return !getUserRoles(req).some(role =>
    LEGAL_REPRESENTATIVE_USER_ROLES.includes(role as (typeof LEGAL_REPRESENTATIVE_USER_ROLES)[number])
  );
}

export function getUserType(req: Request): UserType {
  if (isLegalRepresentativeUser(req)) {
    return 'legalrep';
  }

  return 'citizen';
}
