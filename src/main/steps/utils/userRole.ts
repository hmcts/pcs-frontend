import type { Request } from 'express';

export const LEGAL_REPRESENTATIVE_USER_ROLES = ['caseworker-pcs-solicitor'] as const;
export const STAFF_USER_ROLES = ['caseworker'] as const;

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
  return getUserRoles(req).some(role =>
    LEGAL_REPRESENTATIVE_USER_ROLES.includes(role as (typeof LEGAL_REPRESENTATIVE_USER_ROLES)[number])
  );
}

/**
 * HMCTS staff and judges, who work in Manage Case. IDAM does not tell a judge from a caseworker (both
 * hold caseworker-pcs); judges are known by their role assignments, which CCD checks for each event.
 * Legal representatives also hold caseworker, but use this service.
 */
export function isStaffUser(req: Request): boolean {
  return (
    getUserRoles(req).some(role => STAFF_USER_ROLES.includes(role as (typeof STAFF_USER_ROLES)[number])) &&
    !isLegalRepresentativeUser(req)
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
