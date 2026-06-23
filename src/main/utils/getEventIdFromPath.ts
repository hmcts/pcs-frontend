import { Request } from 'express';

const eventIdMappings: Record<string, string> = {
  'make-an-application': 'makeAnApplication',
  'respond-to-claim': 'respondPossessionClaim',
  'upload-additional-documents': 'uploadDocuments',
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
