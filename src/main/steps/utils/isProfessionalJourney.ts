import type { Request } from 'express';
import * as jose from 'jose';

export const isProfessionalJourney = async (req: Request): Promise<boolean> => {
  const decoded = jose.decodeJwt(req.session.user!.idToken);
  const roles = <string[]>decoded.roles;
  return !(roles[0] === 'citizen');
};
