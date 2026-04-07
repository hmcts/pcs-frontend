import type { Request } from 'express';

export function retrieveJourneyFolder(req: Request): string {
   if( req.session.isProfessional) {
      return "professionalRespondToClaim";
    }
    return "respondToClaim";
}