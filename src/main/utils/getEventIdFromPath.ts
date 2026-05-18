import { Request } from 'express';

const eventIdMappings: Record<string, string> = {
  'make-an-application': 'citizenCreateGenApp',
  'respond-to-claim': 'respondPossessionClaim',
};

export const getEventIdFromPath = (req: Request): string | undefined => {
  const caseRef = req.params?.caseReference;
  if (!caseRef || typeof caseRef !== 'string') {
    return undefined;
  }

  const segments = req.path.split('/');
  const caseRefIndex = segments.indexOf(caseRef);
  const journeySegment = caseRefIndex !== -1 ? segments[caseRefIndex + 1] : undefined;

  return journeySegment ? eventIdMappings[journeySegment] : undefined;
};
