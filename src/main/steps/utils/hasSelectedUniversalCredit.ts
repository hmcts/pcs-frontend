import type { Request } from 'express';

export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const hc = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

  return Boolean(hc?.universalCreditAmount || hc?.universalCreditFrequency);
};
