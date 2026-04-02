import type { Request } from 'express';

export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const universalCredit =
    caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.universalCredit;

  return universalCredit === 'YES';
};
