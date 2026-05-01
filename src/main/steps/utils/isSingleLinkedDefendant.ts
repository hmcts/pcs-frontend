import type { Request } from 'express';

export function isSingleLinkedDefendant (req: Request): boolean {
  const caseData = req.res?.locals?.validatedCase?.data;

  return caseData?.allDefendants?.length === 1;
}
