import type { Request } from 'express';

export const hasSelectedPriorityDebts = (req: Request): boolean => {
  const caseData = req.res?.locals.validatedCase?.data;
  const hc = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

  return Boolean(hc?.debtTotal || hc?.debtContribution || hc?.debtContributionFrequency);
};
