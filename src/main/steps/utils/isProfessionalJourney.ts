import type { Request } from 'express';
import * as jose from 'jose';

export const isProfessionalJourney = (req: Request): boolean => {
  const decoded = jose.decodeJwt(req.session.user!.idToken);
  const roles = decoded.roles as string[];

  return !roles.includes('citizen');
};
