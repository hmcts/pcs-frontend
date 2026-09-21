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

/**
 * A legal representative here has only ever meant the *defendant's* legal representative: the LR
 * journey is the defence, and claimants make claims in XUI.
 *
 * <p>Derived by pcs-api from Group Access - the caller's organisation being the active
 * representative of a defendant on this case - and carried on the case payload. Not inferred from
 * IDAM roles: the group roles never appear there, and the IDAM role this once keyed on was a CCD
 * access-control artefact that HDPI-7333 removes.
 */
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
