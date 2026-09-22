import type { Request } from 'express';

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

/** Defendant solicitor on this case (`session.user.isDefendantSolicitor`), not an IDAM role. */
export function isLegalRepresentativeUser(req: Request): boolean {
  return req.session?.user?.isDefendantSolicitor === true;
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
