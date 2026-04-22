import { Request } from 'express';

const eventIdMappings: { path: string; eventId: string }[] = [
  {
    path: 'make-an-application',
    eventId: 'citizenCreateGenApp',
  },
  {
    path: 'respond-to-claim',
    eventId: 'respondPossessionClaim',
  },
];

export const getEventIdFromPath = (req: Request): string | undefined => {
  const segments = req.path.split('/');
  return eventIdMappings.find(mapping => segments.includes(mapping.path))?.eventId;
};
