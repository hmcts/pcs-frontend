import type { Request } from 'express';

export const PROFESSIONAL_USER_ROLES = ['caseworker', 'professional', 'solicitor'] as const;

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

export function isProfessionalUser(req: Request): boolean {
  const roles = getUserRoles(req);
  return roles.some(role => PROFESSIONAL_USER_ROLES.includes(role as (typeof PROFESSIONAL_USER_ROLES)[number]));
}

export function getUserJourneyVariant(req: Request): 'professional' | 'citizen' {
  return isProfessionalUser(req) ? 'professional' : 'citizen';
}
